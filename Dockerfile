FROM rust:1.92-bookworm

ENV DEBIAN_FRONTEND=noninteractive
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV PATH=$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH

RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    cmake \
    curl \
    git \
    python3 \
    ca-certificates \
    libssl-dev \
    \
    # Tauri Linux dependencies
    libglib2.0-dev \
    libgtk-3-dev \
    libwebkit2gtk-4.1-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    \
    # Android build tools
    openjdk-17-jdk \
    unzip \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

RUN cargo install tauri-cli

# === Install Android SDK + NDK ===
RUN mkdir -p $ANDROID_SDK_ROOT/cmdline-tools/latest \
    && wget https://dl.google.com/android/repository/commandlinetools-linux-9123335_latest.zip -O /tmp/cmdline-tools.zip \
    && unzip /tmp/cmdline-tools.zip -d /tmp \
    && mv /tmp/cmdline-tools/* $ANDROID_SDK_ROOT/cmdline-tools/latest/ \
    && rm -rf /tmp/cmdline-tools.zip /tmp/cmdline-tools

# Accept licenses and install platform + NDK
RUN yes | sdkmanager --licenses
RUN sdkmanager "platform-tools" "platforms;android-34" "ndk;25.2.9519653"

WORKDIR /app

COPY . .

RUN npm ci

CMD ["bash", "-c", "npm run tauri android build && cp -r src-tauri/gen/android/app/build/outputs/ src-tauri/builds/"]
