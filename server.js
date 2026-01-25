const express = require('express');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// AUR RPC API base URL
const AUR_API = 'https://aur.archlinux.org/rpc/v5';

// Detect available AUR helper
async function detectAURHelper() {
    const helpers = ['paru', 'yay', 'pikaur', 'trizen', 'aurman'];
    
    for (const helper of helpers) {
        try {
            const result = await runCommand('which', [helper]);
            if (result.success) {
                return helper;
            }
        } catch (e) {
            continue;
        }
    }
    return null;
}

// Run a command and return result
function runCommand(cmd, args) {
    return new Promise((resolve) => {
        const proc = spawn(cmd, args);
        let stdout = '';
        let stderr = '';
        
        proc.stdout.on('data', (data) => stdout += data.toString());
        proc.stderr.on('data', (data) => stderr += data.toString());
        
        proc.on('close', (code) => {
            resolve({ success: code === 0, stdout, stderr, code });
        });
        
        proc.on('error', () => {
            resolve({ success: false, stdout, stderr, code: -1 });
        });
    });
}

// Search AUR packages
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        const by = req.query.by || 'name-desc';
        
        const response = await fetch(`${AUR_API}/search/${encodeURIComponent(query)}?by=${by}`);
        const data = await response.json();
        
        if (data.type === 'error') {
            return res.status(400).json({ error: data.error });
        }
        
        // Sort by popularity
        const results = (data.results || []).sort((a, b) => b.Popularity - a.Popularity);
        
        res.json({ results: results.slice(0, 100) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get package info
app.get('/api/info/:name', async (req, res) => {
    try {
        const name = req.params.name;
        const response = await fetch(`${AUR_API}/info/${encodeURIComponent(name)}`);
        const data = await response.json();
        
        if (data.type === 'error' || !data.results || data.results.length === 0) {
            return res.status(404).json({ error: 'Package not found' });
        }
        
        res.json({ package: data.results[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get popular packages
app.get('/api/popular', async (req, res) => {
    try {
        // Search for common categories to get popular packages
        const searches = ['browser', 'editor', 'terminal', 'spotify', 'discord', 'vscode', 'chrome', 'firefox', 'steam', 'nvidia', 'amd', 'git', 'docker', 'kubernetes'];
        
        const allResults = [];
        const seen = new Set();
        
        for (const term of searches) {
            try {
                const response = await fetch(`${AUR_API}/search/${encodeURIComponent(term)}?by=name-desc`);
                const data = await response.json();
                
                if (data.results) {
                    for (const pkg of data.results) {
                        if (!seen.has(pkg.Name)) {
                            seen.add(pkg.Name);
                            allResults.push(pkg);
                        }
                    }
                }
            } catch (e) {
                continue;
            }
        }
        
        // Sort by popularity and return top 50
        const sorted = allResults.sort((a, b) => b.Popularity - a.Popularity).slice(0, 50);
        
        res.json({ results: sorted });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get installed packages
app.get('/api/installed', async (req, res) => {
    try {
        const result = await runCommand('pacman', ['-Qm']);
        
        if (!result.success) {
            return res.json({ installed: [] });
        }
        
        const installed = result.stdout.trim().split('\n')
            .filter(line => line)
            .map(line => {
                const [name, version] = line.split(' ');
                return { name, version };
            });
        
        res.json({ installed });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check if package is installed
app.get('/api/installed/:name', async (req, res) => {
    try {
        const name = req.params.name;
        const result = await runCommand('pacman', ['-Q', name]);
        
        res.json({ 
            installed: result.success,
            version: result.success ? result.stdout.trim().split(' ')[1] : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get system info
app.get('/api/system', async (req, res) => {
    try {
        const helper = await detectAURHelper();
        const pacmanResult = await runCommand('pacman', ['--version']);
        
        res.json({
            aurHelper: helper,
            pacmanVersion: pacmanResult.success ? pacmanResult.stdout.split('\n')[0] : 'Unknown'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// WebSocket for real-time installation
wss.on('connection', (ws) => {
    console.log('Client connected');
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.action === 'install') {
                await handleInstall(ws, data.package, data.noconfirm);
            } else if (data.action === 'remove') {
                await handleRemove(ws, data.package);
            } else if (data.action === 'update') {
                await handleUpdate(ws);
            }
        } catch (error) {
            ws.send(JSON.stringify({ type: 'error', message: error.message }));
        }
    });
    
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

async function handleInstall(ws, packageName, noconfirm = false) {
    const helper = await detectAURHelper();
    
    if (!helper) {
        ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'No AUR helper found. Please install yay or paru first.' 
        }));
        return;
    }
    
    ws.send(JSON.stringify({ type: 'start', message: `Installing ${packageName} using ${helper}...` }));
    
    const args = ['-S', packageName];
    if (noconfirm) {
        args.push('--noconfirm');
    }
    
    const proc = spawn(helper, args, {
        env: { ...process.env, TERM: 'xterm-256color' }
    });
    
    proc.stdout.on('data', (data) => {
        ws.send(JSON.stringify({ type: 'output', data: data.toString() }));
    });
    
    proc.stderr.on('data', (data) => {
        ws.send(JSON.stringify({ type: 'output', data: data.toString() }));
    });
    
    proc.on('close', (code) => {
        ws.send(JSON.stringify({ 
            type: 'complete', 
            success: code === 0,
            message: code === 0 ? `${packageName} installed successfully!` : `Installation failed with code ${code}`
        }));
    });
    
    proc.on('error', (error) => {
        ws.send(JSON.stringify({ type: 'error', message: error.message }));
    });
}

async function handleRemove(ws, packageName) {
    ws.send(JSON.stringify({ type: 'start', message: `Removing ${packageName}...` }));
    
    const proc = spawn('sudo', ['pacman', '-Rns', packageName, '--noconfirm'], {
        env: { ...process.env, TERM: 'xterm-256color' }
    });
    
    proc.stdout.on('data', (data) => {
        ws.send(JSON.stringify({ type: 'output', data: data.toString() }));
    });
    
    proc.stderr.on('data', (data) => {
        ws.send(JSON.stringify({ type: 'output', data: data.toString() }));
    });
    
    proc.on('close', (code) => {
        ws.send(JSON.stringify({ 
            type: 'complete', 
            success: code === 0,
            message: code === 0 ? `${packageName} removed successfully!` : `Removal failed with code ${code}`
        }));
    });
}

async function handleUpdate(ws) {
    const helper = await detectAURHelper();
    
    if (!helper) {
        ws.send(JSON.stringify({ type: 'error', message: 'No AUR helper found.' }));
        return;
    }
    
    ws.send(JSON.stringify({ type: 'start', message: 'Updating system...' }));
    
    const proc = spawn(helper, ['-Syu', '--noconfirm'], {
        env: { ...process.env, TERM: 'xterm-256color' }
    });
    
    proc.stdout.on('data', (data) => {
        ws.send(JSON.stringify({ type: 'output', data: data.toString() }));
    });
    
    proc.stderr.on('data', (data) => {
        ws.send(JSON.stringify({ type: 'output', data: data.toString() }));
    });
    
    proc.on('close', (code) => {
        ws.send(JSON.stringify({ 
            type: 'complete', 
            success: code === 0,
            message: code === 0 ? 'System updated successfully!' : `Update failed with code ${code}`
        }));
    });
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     █████╗ ██╗   ██╗██████╗     ███████╗████████╗ ██████╗   ║
║    ██╔══██╗██║   ██║██╔══██╗    ██╔════╝╚══██╔══╝██╔═══██╗  ║
║    ███████║██║   ██║██████╔╝    ███████╗   ██║   ██║   ██║  ║
║    ██╔══██║██║   ██║██╔══██╗    ╚════██║   ██║   ██║   ██║  ║
║    ██║  ██║╚██████╔╝██║  ██║    ███████║   ██║   ╚██████╔╝  ║
║    ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝    ╚══════╝   ╚═╝    ╚═════╝   ║
║                                                              ║
║    🚀 AUR Store is running at http://localhost:${PORT}          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
});
