// Multisynq View for Clipboard UI and Local Monitoring
class ClipboardView extends Multisynq.View {
    constructor(model) {
        super(model);
        
        this.clipboardManager = new ClipboardManager();
        this.database = new KlipyDatabase();
        this.isMonitoring = false;
        this.isDeviceActive = false; // Track if this device is active for sync
        this.userId = null; // Will be set from logged-in user
        this.userEmail = null; // Will be set from logged-in user
        this.userName = null; // Will be set from logged-in user
        this.deviceId = this.generateDeviceId();
        this.deviceName = this.generateDeviceName();
        // Note: this.viewId is automatically provided by Multisynq and is read-only
        
        // Track model reference for easy access
        this.model = model;
        
        this.initializeElements();
        this.bindEvents();
        this.setupModelListeners();
        this.setupClipboardMonitoring();
        
        // Register this device with the model (will be updated with user info later)
        this.registerDevice();
        
        // Delay initial UI update to ensure model is ready
        setTimeout(() => {
            this.updateClipboardDisplay();
        }, 100);
        
        console.log('ClipboardView initialized for viewId:', this.viewId, 'device:', this.deviceName);
    }
    
    // Initialize DOM elements
    initializeElements() {
        this.syncToggleBtn = document.getElementById('sync-toggle');
        this.syncStatus = document.getElementById('sync-status');
        this.deviceInfo = document.getElementById('device-info');
        this.entriesCount = document.getElementById('entries-count');
        this.clipboardEntries = document.getElementById('clipboard-entries');
        this.testClipBtn = document.getElementById('test-clip-btn');
        this.clearClipsBtn = document.getElementById('clear-clips-btn');
        
        // Update device info immediately
        if (this.deviceInfo) {
            this.deviceInfo.textContent = `Device: ${this.deviceName}`;
        }
    }
    
    // Bind UI event listeners
    bindEvents() {
        // Sync toggle
        this.syncToggleBtn?.addEventListener('click', () => this.toggleMonitoring());
        
        // Dev controls
        this.testClipBtn?.addEventListener('click', () => this.addTestClip());
        this.clearClipsBtn?.addEventListener('click', () => this.clearAllClips());
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }
    
    // Setup listeners for model events
    setupModelListeners() {
        // Subscribe to model events using proper scopes
        this.subscribe('clipboard', 'clip-added', this.handleClipAdded.bind(this));
        this.subscribe('clipboard', 'clip-removed', this.handleClipRemoved.bind(this));
        this.subscribe('clipboard', 'clips-cleared', this.handleClipsCleared.bind(this));
        this.subscribe('clipboard', 'clips-updated', this.handleClipsUpdated.bind(this));
        this.subscribe('clipboard', 'devices-updated', this.handleDevicesUpdated.bind(this));
        this.subscribe('clipboard', 'device-activated', this.handleDeviceActivated.bind(this));
        this.subscribe('clipboard', 'device-deactivated', this.handleDeviceDeactivated.bind(this));
        
        // Subscribe to sync-related events for this view
        this.subscribe(this.viewId, 'synced', this.handleSynced.bind(this));
    }
    
    // Setup local clipboard monitoring
    setupClipboardMonitoring() {
        this.clipboardManager.on('clip-added', (clip) => {
            // Only send to model if device is active and user is logged in
            if (this.isDeviceActive && this.userId) {
                // Send to synchronized model
                this.publish('clipboard', 'add-clip', {
                    text: clip.text,
                    userId: this.userId,
                    deviceId: this.deviceId,
                    viewId: this.viewId
                });
            }
        });
    }
    
    // Update method called every frame
    update(time) {
        // Continuous UI updates can be handled here
        // For now, we rely on event-driven updates
    }
    
    // Toggle clipboard monitoring
    toggleMonitoring() {
        if (this.isMonitoring) {
            this.stopMonitoring();
        } else {
            this.startMonitoring();
        }
    }
    
    // Start monitoring local clipboard
    startMonitoring() {
        if (!this.userId) {
            console.error('Cannot start monitoring: User not logged in');
            return;
        }
        
        this.isMonitoring = true;
        this.clipboardManager.startMonitoring();
        
        // Activate this device for sync
        this.publish('clipboard', 'activate-device', {
            deviceId: this.deviceId,
            userId: this.userId,
            viewId: this.viewId
        });
        
        this.isDeviceActive = true;
        
        // Update UI
        this.syncToggleBtn?.setAttribute('data-active', 'true');
        if (this.syncToggleBtn) {
            this.syncToggleBtn.textContent = 'Deactivate Sync';
        }
        if (this.syncStatus) {
            this.syncStatus.textContent = 'Syncing clipboard across devices - Active';
            this.syncStatus.classList.add('active');
        }
        
        console.log('Local clipboard monitoring started for device:', this.deviceId);
    }
    
    // Stop monitoring local clipboard
    stopMonitoring() {
        this.isMonitoring = false;
        this.clipboardManager.stopMonitoring();
        
        // Deactivate this device for sync
        this.publish('clipboard', 'deactivate-device', {
            deviceId: this.deviceId,
            userId: this.userId,
            viewId: this.viewId
        });
        
        this.isDeviceActive = false;
        
        // Update UI
        this.syncToggleBtn?.setAttribute('data-active', 'false');
        if (this.syncToggleBtn) {
            this.syncToggleBtn.textContent = 'Activate Sync';
        }
        if (this.syncStatus) {
            this.syncStatus.textContent = 'Click to activate syncing';
            this.syncStatus.classList.remove('active');
        }
        
        console.log('Local clipboard monitoring stopped for device:', this.deviceId);
    }
    
    // Register this device with the model
    registerDevice() {
        this.publish('clipboard', 'register-device', {
            deviceId: this.deviceId,
            userId: this.userId,
            deviceName: this.deviceName,
            viewId: this.viewId
        });
    }
    
    // Unregister this device from the model
    unregisterDevice() {
        this.publish('clipboard', 'unregister-device', {
            deviceId: this.deviceId,
            viewId: this.viewId
        });
    }
    
    // Handle clip added event from model
    handleClipAdded(clip) {
        console.log('Model notified: clip added by', clip.userId, ':', clip.text.substring(0, 30) + '...');
        this.updateClipboardDisplay();
    }
    
    // Handle clip removed event from model
    handleClipRemoved(clip) {
        console.log('Model notified: clip removed:', clip.id);
        this.updateClipboardDisplay();
    }
    
    // Handle clips cleared event from model
    handleClipsCleared(data) {
        console.log('Model notified: all clips cleared, count was:', data.count);
        this.updateClipboardDisplay();
    }
    
    // Handle clips updated event from model
    handleClipsUpdated(data) {
        this.updateClipboardDisplay();
    }
    
    // Handle devices updated event from model
    handleDevicesUpdated(data) {
        console.log('Devices updated:', data.count, 'devices connected');
        this.updateDeviceDisplay(data.devices);
    }
    
    // Handle device activated event from model
    handleDeviceActivated(data) {
        console.log('Device activated:', data.deviceId, data.deviceName);
        if (data.deviceId === this.deviceId) {
            // This is our device
            this.isDeviceActive = true;
            if (this.syncStatus) {
                this.syncStatus.innerHTML = `
                    <div class="device-status active">
                        <div class="device-indicator active"></div>
                        Active - Syncing clipboard
                    </div>
                `;
            }
        }
    }
    
    // Handle device deactivated event from model
    handleDeviceDeactivated(data) {
        console.log('Device deactivated:', data.deviceId, data.deviceName);
        if (data.deviceId === this.deviceId) {
            // This is our device
            this.isDeviceActive = false;
            if (this.syncStatus) {
                this.syncStatus.innerHTML = `
                    <div class="device-status">
                        <div class="device-indicator"></div>
                        Connected - Click to activate sync
                    </div>
                `;
            }
        }
    }
    
    // Handle synced event (when connection is established/lost)
    handleSynced(isSynced) {
        console.log('Sync status changed:', isSynced);
        if (isSynced) {
            console.log('Successfully synced with Multisynq session');
        } else {
            console.log('Lost sync with Multisynq session');
        }
    }

    // Update device display in UI
    updateDeviceDisplay(devices) {
        // Update sync status with device count
        if (this.syncStatus) {
            const deviceCount = devices.length;
            this.syncStatus.innerHTML = `
                <div class="device-status">
                    <div class="device-indicator"></div>
                    Connected - ${deviceCount} device${deviceCount === 1 ? '' : 's'} syncing
                </div>
            `;
        }
    }
    
    // Update the clipboard entries display
    updateClipboardDisplay() {
        // Check if model is ready
        if (!this.model || typeof this.model.getAllClips !== 'function') {
            console.warn('Model not ready yet, skipping UI update');
            return;
        }
        
        const clips = this.model.getAllClips();
        const count = clips.length;
        
        // Update count
        if (this.entriesCount) {
            this.entriesCount.textContent = `${count} ${count === 1 ? 'entry' : 'entries'}`;
        }
        
        // Clear current display
        if (!this.clipboardEntries) return;
        
        if (count === 0) {
            // Show empty state
            this.clipboardEntries.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h4>No clipboard entries yet</h4>
                    <p>Activate sync and copy some text to get started</p>
                </div>
            `;
        } else {
            // Show clips
            this.clipboardEntries.innerHTML = clips.map(clip => 
                this.createClipElement(clip)
            ).join('');
        }
    }
    
    // Create HTML element for a clip
    createClipElement(clip) {
        const timestamp = this.formatTimestamp(clip.timestamp);
        const isFromThisDevice = clip.userId === this.userId && clip.deviceId === this.deviceId;
        const deviceIndicator = isFromThisDevice ? '📱' : '🔄';
        const deviceLabel = isFromThisDevice ? 'This device' : `From ${clip.userId}`;
        const isLong = clip.text.length > 200;
        const displayText = isLong ? clip.text.substring(0, 200) + '...' : clip.text;
        
        return `
            <div class="clipboard-entry slide-in" data-clip-id="${clip.id}">
                <div class="entry-header">
                    <span class="entry-timestamp">${deviceIndicator} ${timestamp} • ${deviceLabel}</span>
                    <div class="entry-actions">
                        <button class="btn-icon copy-btn" onclick="clipboardView.copyClip('${clip.id}')" title="Copy to clipboard">
                            📋
                        </button>
                        <button class="btn-icon delete-btn" onclick="clipboardView.deleteClip('${clip.id}')" title="Delete">
                            ✖️
                        </button>
                    </div>
                </div>
                <div class="entry-text" ${isLong ? `onclick="clipboardView.toggleExpand(this)"` : ''}>
                    ${this.escapeHtml(displayText)}
                    ${isLong ? '<span style="opacity: 0.7; cursor: pointer;"> (click to expand)</span>' : ''}
                </div>
            </div>
        `;
    }
    
    // Copy clip to clipboard
    async copyClip(clipId) {
        const clips = this.model.getAllClips();
        const clip = clips.find(c => c.id == clipId);
        
        if (clip) {
            const success = await this.clipboardManager.copyToClipboard(clip.text);
            if (success) {
                console.log('Clip copied to clipboard');
            } else {
                // Fallback: select text for manual copying
                this.selectText(clip.text);
            }
        }
    }
    
    // Delete clip
    deleteClip(clipId) {
        this.publish('clipboard', 'remove-clip', { clipId: parseFloat(clipId) });
    }
    
    // Toggle expand for long text
    toggleExpand(element) {
        const entryElement = element.closest('.clipboard-entry');
        const clipId = entryElement?.getAttribute('data-clip-id');
        const clip = this.model.getAllClips().find(c => c.id == clipId);
        
        if (clip && clip.text.length > 200) {
            if (element.classList.contains('expanded')) {
                element.innerHTML = this.escapeHtml(clip.text.substring(0, 200) + '...') + 
                    '<span style="opacity: 0.7; cursor: pointer;"> (click to expand)</span>';
                element.classList.remove('expanded');
            } else {
                element.innerHTML = this.escapeHtml(clip.text) + 
                    '<span style="opacity: 0.7; cursor: pointer;"> (click to collapse)</span>';
                element.classList.add('expanded');
            }
        }
    }
    
    // Add test clip (for development)
    addTestClip() {
        const testTexts = [
            'Test clipboard entry from Multisynq',
            'Another synchronized test entry with longer text that demonstrates cross-device synchronization',
            'https://multisynq.io/docs/client/',
            'Test with special characters: !@#$%^&*()',
            `Multi-line test entry
with line breaks
synchronized across devices`,
            '{"multisynq": "awesome", "realtime": true}',
            'console.log("Synchronized clipboard!");',
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
        ];
        
        const randomText = testTexts[Math.floor(Math.random() * testTexts.length)];
        
        this.publish('clipboard', 'add-clip', {
            text: randomText,
            userId: this.userId,
            deviceId: this.deviceId
        });
    }
    
    // Clear all clips
    clearAllClips() {
        if (confirm('Are you sure you want to clear all clipboard entries for all devices?')) {
            this.publish('clipboard', 'clear-clips', {});
        }
    }
    
    // Generate unique user ID
    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 8);
    }
    
    // Generate unique device ID (persistent across page reloads)
    generateDeviceId() {
        // Try to get existing device ID from localStorage
        let deviceId = localStorage.getItem('klipy-device-id');
        if (!deviceId) {
            // Generate new device ID and store it
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            localStorage.setItem('klipy-device-id', deviceId);
        }
        return deviceId;
    }
    
    // Generate device name based on browser/platform
    generateDeviceName() {
        const platform = navigator.platform || 'Unknown';
        const browser = this.getBrowserName();
        return `${platform} - ${browser}`;
    }
    
    // Get browser name
    getBrowserName() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Browser';
    }
    
    // Format timestamp for display
    formatTimestamp(timestamp) {
        // Multisynq timestamps are in milliseconds from model start
        // Convert to a relative time display
        const now = this.now(); // Use view's now() method, not model's
        const diffMs = now - timestamp;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        
        if (diffMs < 60000) {
            return 'Just now';
        } else if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else {
            return `${Math.floor(diffHours / 24)}d ago`;
        }
    }
    
    // Select text for manual copying (fallback)
    selectText(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log('Text selected for manual copying');
    }
    
    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    }

    // Set user information (called from app after login)
    setUserInfo(user) {
        this.userId = user.id;
        this.userEmail = user.email;
        this.userName = user.name;
        
        // Update device registration with user info (not re-register)
        this.publish('clipboard', 'update-device', {
            deviceId: this.deviceId,
            userId: this.userId,
            deviceName: this.deviceName,
            viewId: this.viewId
        });
        
        console.log('User info set in ClipboardView:', this.userName, this.userEmail);
    }
}
