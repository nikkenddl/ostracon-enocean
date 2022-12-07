# Setting up a Raspberry Pi with EnOcean ostracon IoT gateway

## 1. Setup a Raspberry Pi

### Disable screen blanking (optional)

```bash
sudo  raspi-config
```

`2 Display Options` => `D4 Screen Blanking` => select `No`.

### Enable power button on GPIO3 and change power LED behaviour

With this settings,
- Long press power switch on GPIO3 shuts down Raspberry Pi
- Blink green LED to see if Raspberry pi is running

```bash
sudo nano /boot/config.txt
```

```bash
# Add following to the end
dtparam=act_led_trigger=timer
dtoverlay=gpio-shutdown,debounce=3000
```

## 2. Installing Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - &&\
sudo apt-get install -y nodejs
```

## 3. Check if EnOcean USB dongle

### Fixing EnOcean USB dongle serial port path

```bash
sudo touch /etc/udev/rules.d/90-enocean.rules
echo "# EnOcean" | sudo tee /etc/udev/rules.d/90-enocean.rules
echo 'SUBSYSTEM=="tty", ATTRS{product}=="EnOcean USB 400J DD", SYMLINK+="ttyUSB_EnOcean", GROUP="dialout"' | sudo tee -a /etc/udev/rules.d/90-enocean.rules
```

```bash
# Check if setting succeeded
cat /etc/udev/rules.d/90-enocean.rules

# Success if following is returned
# # EnOcean
# SUBSYSTEM=="tty", ATTRS{idModel}=="EnOcean_USB_400J_DD", SYMLINK+="ttyUSB_EnOcean", GROUP="dialout"
```

```bash
# Apply `udevadm` rules
sudo udevadm control --reload-rules && sudo udevadm trigger
```

### Check if USB dongle is working

```bash
# Install screen
sudo apt-get install -y screen
```

```bash
sudo screen /dev/ttyUSB_EnOcean 57600
```

- OK if some random characters printed on screen on EnOcean button push.
- Press `ctrl+a` then `k` to quit.

## 4. Run script

see `README.md`.
