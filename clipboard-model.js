// Multisynq Model for Clipboard Synchronization

// Define constants for the session
const Q = Multisynq.Constants;
Q.MAX_CLIPS = 100;
Q.DEVICE_TIMEOUT = 300000; // 5 minutes in milliseconds

class ClipboardModel extends Multisynq.Model {
    init() {
        this.clips = [];
        this.maxClips = Q.MAX_CLIPS;
        this.lastActivity = this.now();
        this.connectedDevices = new Map(); // Map<deviceId, deviceInfo>
        this.deviceViewMap = new Map(); // Map<viewId, deviceId>
        
        // Subscribe to clipboard events from views
        this.subscribe('clipboard', 'add-clip', this.handleAddClip);
        this.subscribe('clipboard', 'remove-clip', this.handleRemoveClip);
        this.subscribe('clipboard', 'clear-clips', this.handleClearClips);
        this.subscribe('clipboard', 'register-device', this.handleRegisterDevice);
        this.subscribe('clipboard', 'update-device', this.handleUpdateDevice);
        this.subscribe('clipboard', 'unregister-device', this.handleUnregisterDevice);
        this.subscribe('clipboard', 'activate-device', this.handleActivateDevice);
        this.subscribe('clipboard', 'deactivate-device', this.handleDeactivateDevice);
        
        // Subscribe to system events using sessionId as scope
        this.subscribe(this.sessionId, 'view-join', this.handleViewJoin);
        this.subscribe(this.sessionId, 'view-exit', this.handleViewExit);
        
        console.log('ClipboardModel initialized at', this.now());
    }
    
    // Handle adding a new clipboard entry
    handleAddClip(data) {
        const clip = {
            id: this.generateId(),
            text: data.text.trim(),
            timestamp: this.now(),
            userId: data.userId || 'anonymous',
            deviceId: data.deviceId || 'unknown'
        };
        
        // Check for duplicates in recent clips (last 5)
        const recentClips = this.clips.slice(0, 5);
        const isDuplicate = recentClips.some(c => c.text === clip.text);
        
        if (!isDuplicate && clip.text.length > 0) {
            // Add to beginning of array
            this.clips.unshift(clip);
            
            // Keep only maxClips entries
            if (this.clips.length > this.maxClips) {
                this.clips = this.clips.slice(0, this.maxClips);
            }
            
            this.lastActivity = this.now();
            
            // Update device activity
            if (this.connectedDevices.has(clip.deviceId)) {
                const device = this.connectedDevices.get(clip.deviceId);
                device.lastActivity = this.now();
                this.connectedDevices.set(clip.deviceId, device);
            }
            
            // Notify views
            this.publish('clipboard', 'clip-added', clip);
            this.publish('clipboard', 'clips-updated', { 
                clips: this.clips,
                count: this.clips.length 
            });
            
            console.log('Clip added:', clip.text.substring(0, 50) + '...');
        }
    }
    
    // Handle removing a clipboard entry
    handleRemoveClip(data) {
        const index = this.clips.findIndex(clip => clip.id === data.clipId);
        if (index > -1) {
            const removedClip = this.clips.splice(index, 1)[0];
            this.lastActivity = this.now();
            
            // Notify views
            this.publish('clipboard', 'clip-removed', removedClip);
            this.publish('clipboard', 'clips-updated', { 
                clips: this.clips,
                count: this.clips.length 
            });
            
            console.log('Clip removed:', removedClip.id);
        }
    }
    
    // Handle clearing all clips
    handleClearClips(data) {
        const count = this.clips.length;
        this.clips = [];
        this.lastActivity = this.now();
        
        // Notify views
        this.publish('clipboard', 'clips-cleared', { count });
        this.publish('clipboard', 'clips-updated', { 
            clips: this.clips,
            count: 0 
        });
        
        console.log('All clips cleared, count was:', count);
    }
    
    // Handle device registration
    handleRegisterDevice(data) {
        // Check if device is already registered
        if (this.connectedDevices.has(data.deviceId)) {
            console.log('Device already registered:', data.deviceId);
            // Update last activity time
            const device = this.connectedDevices.get(data.deviceId);
            device.lastActivity = this.now();
            device.viewId = data.viewId; // Update viewId
            this.connectedDevices.set(data.deviceId, device);
        } else {
            // Register new device
            this.connectedDevices.set(data.deviceId, {
                deviceId: data.deviceId,
                userId: data.userId,
                deviceName: data.deviceName || 'Unknown Device',
                viewId: data.viewId,
                isActive: false, // Devices start inactive
                joinTime: this.now(),
                lastActivity: this.now()
            });
            console.log('New device registered:', data.deviceId);
        }
        
        // Store device-to-view mapping
        if (data.viewId) {
            this.deviceViewMap.set(data.viewId, data.deviceId);
        }
        
        // Notify all views about device changes
        this.publish('clipboard', 'devices-updated', {
            devices: Array.from(this.connectedDevices.values()),
            count: this.connectedDevices.size
        });
        
        console.log('Device registered:', data.deviceId);
    }
    
    // Handle device activation (user clicks "Activate Sync")
    handleActivateDevice(data) {
        if (this.connectedDevices.has(data.deviceId)) {
            const device = this.connectedDevices.get(data.deviceId);
            device.isActive = true;
            device.lastActivity = this.now();
            this.connectedDevices.set(data.deviceId, device);
            
            // Notify all views
            this.publish('clipboard', 'devices-updated', {
                devices: Array.from(this.connectedDevices.values()),
                count: this.connectedDevices.size
            });
            
            this.publish('clipboard', 'device-activated', {
                deviceId: data.deviceId,
                deviceName: device.deviceName
            });
            
            console.log('Device activated:', data.deviceId);
        }
    }
    
    // Handle device deactivation (user clicks "Deactivate Sync")
    handleDeactivateDevice(data) {
        if (this.connectedDevices.has(data.deviceId)) {
            const device = this.connectedDevices.get(data.deviceId);
            device.isActive = false;
            device.lastActivity = this.now();
            this.connectedDevices.set(data.deviceId, device);
            
            // Notify all views
            this.publish('clipboard', 'devices-updated', {
                devices: Array.from(this.connectedDevices.values()),
                count: this.connectedDevices.size
            });
            
            this.publish('clipboard', 'device-deactivated', {
                deviceId: data.deviceId,
                deviceName: device.deviceName
            });
            
            console.log('Device deactivated:', data.deviceId);
        }
    }
    
    // Handle device unregistration
    handleUnregisterDevice(data) {
        if (this.connectedDevices.has(data.deviceId)) {
            this.connectedDevices.delete(data.deviceId);
            
            // Remove from view mapping
            for (const [viewId, deviceId] of this.deviceViewMap.entries()) {
                if (deviceId === data.deviceId) {
                    this.deviceViewMap.delete(viewId);
                    break;
                }
            }
            
            // Notify all views about device changes
            this.publish('clipboard', 'devices-updated', {
                devices: Array.from(this.connectedDevices.values()),
                count: this.connectedDevices.size
            });
            
            console.log('Device unregistered:', data.deviceId);
        }
    }
    
    // Handle device update (when user info is added after login)
    handleUpdateDevice(data) {
        if (this.connectedDevices.has(data.deviceId)) {
            const device = this.connectedDevices.get(data.deviceId);
            // Update device with user information
            device.userId = data.userId;
            device.lastActivity = this.now();
            if (data.deviceName) device.deviceName = data.deviceName;
            if (data.viewId) device.viewId = data.viewId;
            
            this.connectedDevices.set(data.deviceId, device);
            
            // Update device-to-view mapping
            if (data.viewId) {
                this.deviceViewMap.set(data.viewId, data.deviceId);
            }
            
            // Notify all views about device changes
            this.publish('clipboard', 'devices-updated', {
                devices: Array.from(this.connectedDevices.values()),
                count: this.connectedDevices.size
            });
            
            console.log('Device updated with user info:', data.deviceId, 'User:', data.userId);
        }
    }

    // Handle view join system event
    handleViewJoin(viewId) {
        console.log('System: View joined', viewId);
        // The actual device info will come via register-device event
        // We just track that a new view has joined
    }
    
    // Handle view exit system event  
    handleViewExit(viewId) {
        console.log('System: View exited', viewId);
        
        // Find and remove device by viewId
        const deviceId = this.deviceViewMap.get(viewId);
        if (deviceId && this.connectedDevices.has(deviceId)) {
            this.connectedDevices.delete(deviceId);
            this.deviceViewMap.delete(viewId);
            
            // Notify all views about device changes
            this.publish('clipboard', 'devices-updated', {
                devices: Array.from(this.connectedDevices.values()),
                count: this.connectedDevices.size
            });
            
            this.publish('clipboard', 'device-disconnected', {
                deviceId,
                viewId
            });
            
            console.log('Device disconnected:', deviceId, 'viewId:', viewId);
        }
    }
    
    // Generate unique ID using model time
    generateId() {
        return this.now() + Math.random();
    }
    
    // Get all clips (for view access)
    getAllClips() {
        return [...this.clips];
    }
    
    // Get clip count
    getClipCount() {
        return this.clips.length;
    }
    
    // Get last activity time
    getLastActivity() {
        return this.lastActivity;
    }
    
    // Get model status
    getStatus() {
        return {
            clipCount: this.clips.length,
            lastActivity: this.lastActivity,
            modelTime: this.now(),
            deviceCount: this.connectedDevices.size
        };
    }
    
    // Get connected devices
    getConnectedDevices() {
        return Array.from(this.connectedDevices.values());
    }
    
    // Get device count
    getDeviceCount() {
        return this.connectedDevices.size;
    }
}

// Register the model with Multisynq
ClipboardModel.register('ClipboardModel');

// Export for global access
window.ClipboardModel = ClipboardModel;
