"use strict";

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
class BertoAccessory {
    constructor(platform, accessory) {
        this.platform = platform;
        this.accessory = accessory;
        this.platform.log.debug(JSON.stringify(accessory.context.device, null, 2));
        // Set accessory information
        this.accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, accessory.context.device.manufacturer || 'Default-Manufacturer')
            .setCharacteristic(this.platform.Characteristic.Model, accessory.context.device.model || 'Default-Model')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.serial || 'Default-Serial');
        // Set service
        this.service = this.accessory.getService(this.platform.Service[accessory.context.device.service]) || this.accessory.addService(this.platform.Service[accessory.context.device.service]);
        // Set the service name
        this.service.updateCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);
        // Register handlers for the Characteristic
        for (const characteristic in accessory.context.device.characteristics) {
            // Add Set Handler If Exists
            if (this['set' + characteristic]) {
                this.platform.log.debug('Adding "' + characteristic + '" Set Handler');
                this.service.getCharacteristic(this.platform.Characteristic[characteristic])
                    .onSet(this['set' + characteristic].bind(this)); // SET - bind to the `setOn` method below
            }
            if (this['get' + characteristic]) {
                this.platform.log.debug('Adding "' + characteristic + '" Get Handler');
                this.service.getCharacteristic(this.platform.Characteristic[characteristic])
                    .onGet(this['get' + characteristic].bind(this)); // GET - bind to the `getOn` method below
            }
            // Update Characteristic Stat
            this.platform.log.debug('Updating "' + characteristic + '" -> ' + accessory.context.device.characteristics[characteristic]);
            this.service.updateCharacteristic(this.platform.Characteristic[characteristic], accessory.context.device.characteristics[characteristic]);
        }
        delete this.accessory.context.timer;
    }
    // Handlers
    async setOn(value) { this.setCharacteristic('On', value); }
    async getOn() { return this.getCharacteristic('On'); }
    async setBrightness(value) { this.setCharacteristic('Brightness', value); }
    async getBrightness() { return this.getCharacteristic('Brightness'); }
    async setHue(value) { this.setCharacteristic('Hue', value); }
    async getHue() { return this.getCharacteristic('Hue'); }
    async setColorTemperature(value) { this.setCharacteristic('ColorTemperature', value); }
    async getColorTemperature() { return this.getCharacteristic('ColorTemperature'); }
    async setSaturation(value) { this.setCharacteristic('Saturation', value); }
    async getSaturation() { return this.getCharacteristic('Saturation'); }
    async getCurrentPosition() { return this.getCharacteristic('CurrentPosition'); }
    async getPositionState() { return this.getCharacteristic('PositionState'); }
    async setTargetPosition(value) { this.setCharacteristic('TargetPosition', value); }
    async getTargetPosition() { return this.getCharacteristic('TargetPosition'); }
    async geCurrentDoorState() { return this.getCharacteristic('CurrentDoorState'); }
    async getObstructionDetected() { return this.getCharacteristic('ObstructionDetected'); }
    async setTargetDoorState(value) { this.setCharacteristic('TargetDoorState', value); }
    async getTargetDoorState() { return this.getCharacteristic('TargetDoorState'); }
    async getLockCurrentState() { return this.getCharacteristic('LockCurrentState'); }
    async setLockTargetState(value) { this.setCharacteristic('LockTargetState', value); }
    async getLockTargetState() { return this.getCharacteristic('LockTargetState'); }
    async setActive(value) { this.setCharacteristic('Active', value); }
    async getActive() { return this.getCharacteristic('Active'); }
    async getInUse() { return this.getCharacteristic('InUse'); }
    async getValveType() { return this.getCharacteristic('ValveType'); }
    // Set Characteristic
    setCharacteristic(characteristic, value) {
        this.platform.log.debug('Set Characteristic ' + characteristic + ' -> ', value);
        this.accessory.context.device.characteristics[characteristic] = value;
        const response = JSON.stringify({ topic: 'set', payload: this.accessory.context.device });
        // Send To Clients
        for (const index in this.platform.clients) {
            this.platform.clients[index].send(response);
        }
    }
    // Get Characteristic
    getCharacteristic(characteristic) {
        if (!this.accessory.context.timer) {
            this.accessory.context.timer = setTimeout(() => {
                delete this.accessory.context.timer;
            }, 5000);
            this.platform.log.debug('Get Characteristic ' + characteristic + ' For Accessory ' + this.accessory.context.device.id);
            const response = JSON.stringify({ topic: 'get', payload: this.accessory.context.device.id });
            // Send To Clients
            for (const index in this.platform.clients) {
                this.platform.clients[index].send(response);
            }
        }
        return this.accessory.context.device.characteristics[characteristic];
    }
}
exports.BertoAccessory = BertoAccessory;
