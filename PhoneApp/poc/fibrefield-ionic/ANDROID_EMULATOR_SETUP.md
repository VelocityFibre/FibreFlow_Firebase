# Android Emulator Setup Guide for FibreField

## Quick Overview
To test FibreField on an emulator, you need Android Studio which includes the Android Virtual Device (AVD) Manager.

---

## 🐧 Linux Setup (Arch/CachyOS)

### Step 1: Install Android Studio

#### Option A: Using AUR (Recommended for Arch-based)
```bash
# Install from AUR
yay -S android-studio

# Or using paru
paru -S android-studio
```

#### Option B: Manual Download
1. Download from: https://developer.android.com/studio
2. Extract the archive:
   ```bash
   cd ~/Downloads
   tar -xzf android-studio-*.tar.gz
   sudo mv android-studio /opt/
   ```
3. Create desktop entry:
   ```bash
   /opt/android-studio/bin/studio.sh
   ```

### Step 2: Initial Android Studio Setup
1. Launch Android Studio
2. Complete the setup wizard (choose "Standard" installation)
3. Let it download Android SDK components (~2-3GB)

### Step 3: Enable Hardware Acceleration (Important!)
```bash
# Check if KVM is available
LC_ALL=C lscpu | grep Virtualization

# Install KVM modules
sudo pacman -S qemu-desktop libvirt virt-manager

# Add your user to kvm group
sudo usermod -aG kvm $USER

# Log out and back in, then verify
groups | grep kvm
```

### Step 4: Create Android Virtual Device
1. In Android Studio: **Tools → AVD Manager**
2. Click **"Create Virtual Device"**
3. Choose device: **Pixel 6** (good for testing)
4. Download system image: **API 33 (Android 13)** or **API 34**
5. Select **x86_64 ABI** for better performance
6. Finish setup with default settings

### Step 5: Optimize Emulator Performance
1. Edit emulator settings (click pencil icon in AVD Manager)
2. **Advanced Settings**:
   - Graphics: **Hardware - GLES 2.0**
   - RAM: **4096 MB** (or more if available)
   - VM Heap: **512 MB**
   - Internal Storage: **2048 MB**

---

## 🪟 Windows Setup

### Step 1: Download & Install Android Studio
1. Download from: https://developer.android.com/studio
2. Run the installer (.exe)
3. During installation:
   - ✅ Android Studio
   - ✅ Android SDK
   - ✅ Android Virtual Device
   - ✅ Intel HAXM (hardware acceleration)

### Step 2: Enable Hardware Acceleration

#### For Intel CPUs:
1. **Enable VT-x in BIOS**:
   - Restart computer
   - Enter BIOS (F2/Del/F10 at startup)
   - Find "Intel Virtualization Technology" 
   - Enable it
   - Save and exit

2. **Install Intel HAXM**:
   - Android Studio should install it automatically
   - If not: SDK Manager → SDK Tools → Intel x86 Emulator Accelerator

#### For AMD CPUs:
1. **Enable SVM in BIOS**
2. **Enable Windows Hypervisor Platform**:
   ```powershell
   # Run as Administrator
   Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform
   ```

### Step 3: Create AVD (Same as Linux)
1. **Tools → AVD Manager**
2. **Create Virtual Device**
3. Choose **Pixel 6**
4. Download **API 33** or newer
5. Select **x86_64** image

### Step 4: Windows-Specific Optimizations
1. **Disable Hyper-V** if not using WSL2:
   ```powershell
   # Run as Administrator
   bcdedit /set hypervisorlaunchtype off
   # Restart computer
   ```

2. **Allocate more RAM** to emulator:
   - AVD Manager → Edit → Advanced
   - Set RAM to 4096+ MB

---

## 🚀 Running FibreField on Emulator

### Step 1: Start the Emulator
```bash
# From terminal (Linux/Windows)
cd /path/to/FibreFlow/PhoneApp/poc/fibrefield-ionic

# List available emulators
npx cap run android --list

# Start specific emulator
npx cap run android --target [emulator-name]
```

### Step 2: Alternative - Use Android Studio
1. Open Android project:
   ```bash
   npx cap open android
   ```
2. Wait for Gradle sync
3. Select emulator from device dropdown
4. Click **Run** button (green triangle)

### Step 3: Test Native Features

#### Camera Testing
- Emulator has virtual camera scenes
- Use **Ctrl+Shift+C** (Linux) or **Ctrl+Alt+C** (Windows) to access camera controls

#### GPS Testing
1. Click **"..."** (More) in emulator toolbar
2. Go to **Location** tab
3. Set coordinates or search location
4. Click **SET LOCATION**

#### Storage Testing
- Emulator provides full file system access
- Test unlimited photo storage
- Check via: Settings → Storage

---

## 📱 Recommended Emulator Settings for FibreField

```
Device: Pixel 6 or Pixel 7
API Level: 33 or 34 (Android 13/14)
ABI: x86_64
RAM: 4096 MB
VM Heap: 512 MB
Internal Storage: 4096 MB
SD Card: 1024 MB
Graphics: Hardware - GLES 2.0
```

---

## 🔧 Troubleshooting

### Linux Issues

**"KVM is not installed"**
```bash
sudo pacman -S qemu-desktop
sudo modprobe kvm-intel  # or kvm-amd
```

**"dev/kvm device permission denied"**
```bash
sudo chmod 666 /dev/kvm
# Or better:
sudo usermod -aG kvm $USER
# Then logout/login
```

**Emulator crashes**
```bash
# Try software rendering
emulator -avd Pixel_6_API_33 -gpu swiftshader_indirect
```

### Windows Issues

**"HAXM not installed"**
1. Download manually: https://github.com/intel/haxm/releases
2. Install HAXM
3. Restart Android Studio

**"VT-x is disabled"**
- Must enable in BIOS (see Windows Step 2)

**Slow emulator**
- Disable Windows Defender real-time scanning for Android Studio folder
- Close other heavy applications

---

## 🏃 Quick Start Commands

### After emulator is set up:
```bash
# 1. Navigate to project
cd /home/ldp/VF/Apps/FibreFlow/PhoneApp/poc/fibrefield-ionic

# 2. Build and sync
npm run build
npx cap sync

# 3. Run on emulator (auto-selects if only one running)
npx cap run android

# 4. With live reload (recommended for development)
npx cap run android --livereload --external
```

---

## ✅ Verification Checklist

Your emulator is ready when you can:
- [ ] Launch emulator from AVD Manager
- [ ] See Android home screen
- [ ] Access emulator settings
- [ ] Install apps via Android Studio
- [ ] Camera shows virtual scene
- [ ] GPS location can be set
- [ ] Network shows connected

---

## 📊 Performance Expectations

| Feature | Physical Device | Emulator |
|---------|----------------|----------|
| Boot Time | 10-20s | 30-60s |
| App Launch | Instant | 2-5s |
| Camera | Real | Virtual scenes |
| GPS | Real GPS | Simulated |
| Storage | Device storage | Host storage |
| Network | Real network | NAT through host |

---

## 🎯 Next Steps

1. **Start emulator** using AVD Manager
2. **Deploy FibreField** using `npx cap run android`
3. **Test key features**:
   - Capture multiple poles (test unlimited storage)
   - Use emulated camera
   - Set GPS locations
   - Test offline/online sync
4. **Compare** with browser limitations

The emulator provides 90% of real device functionality - perfect for demonstrating FibreField's native advantages over browser-based storage limitations!