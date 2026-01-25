# AUS Arch User Store

A modern, Apple-inspired graphical package manager for the Arch User Repository (AUR).

![AUR Store](https://img.shields.io/badge/Arch%20Linux-1793D1?style=for-the-badge&logo=arch-linux&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)

## Features

- **Modern UI**: Sleek, Apple-inspired dark theme with glassmorphism effects
- **Real AUR Integration**: Fetches actual packages from the AUR API
- **Package Installation**: Install packages using yay, paru, or other AUR helpers
- **Dependency Display**: View all dependencies before installing
- **Real-time Terminal**: Watch installation progress in the built-in terminal
- **Search**: Fast search across all AUR packages
- **Package Management**: Install, remove, and update packages with one click

## Requirements

- Arch Linux (or Arch-based distribution)
- Node.js 18+ 
- An AUR helper installed (one of):
  - `paru` (recommended)
  - `yay`
  - `pikaur`
  - `trizen`
  - `aurman`

## Installation

1. Clone or download this repository:
```bash
cd /path/to/aur-store
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

### Browsing Packages

- **Discover**: View featured and popular packages
- **Browse**: See all available packages
- **Search**: Use the search bar (Ctrl+K) to find specific packages
- **Installed**: View all AUR packages installed on your system

### Installing Packages

1. Click on a package card to view details
2. Review dependencies and package information
3. Click "Install" to begin installation
4. Watch the progress in the terminal panel

### Removing Packages

1. Navigate to "Installed" in the sidebar
2. Click on a package
3. Click "Remove" to uninstall

### Updating Packages

Click the "Update" button in the header to update all packages.

## Architecture

```
aur-store/
├── server.js          # Express + WebSocket server
├── public/
│   ├── index.html     # Main HTML
│   ├── styles.css     # Apple-inspired styling
│   └── app.js         # Frontend application
└── package.json
```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/search?q=query` | Search AUR packages |
| `GET /api/info/:name` | Get package details |
| `GET /api/popular` | Get popular packages |
| `GET /api/installed` | List installed AUR packages |
| `GET /api/installed/:name` | Check if package is installed |
| `GET /api/system` | Get system info (AUR helper, etc.) |

### WebSocket Actions

| Action | Description |
|--------|-------------|
| `install` | Install a package |
| `remove` | Remove a package |
| `update` | Update all packages |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Focus search |
| `Escape` | Close modal |

## Security Notes

- Package installations require the AUR helper to handle sudo prompts
- The application runs locally and does not expose any external endpoints
- All package operations are performed through your configured AUR helper

## Troubleshooting

### "No AUR helper found"

Install an AUR helper:
```bash
# Install yay
sudo pacman -S --needed git base-devel
git clone https://aur.archlinux.org/yay.git
cd yay
makepkg -si

# Or install paru
git clone https://aur.archlinux.org/paru.git
cd paru
makepkg -si
```

### Packages not installing

Make sure your AUR helper is configured correctly and you can install packages manually:
```bash
yay -S package-name
```

## License

MIT License
