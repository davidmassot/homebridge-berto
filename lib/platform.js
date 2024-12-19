"use strict";

const Settings = require("./settings");
const Accessory = require("./accessory");
const Websocket = require("./websocket");

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
class BertoPlatform {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        // this is used to track restored cached accessories
        this.accessories = [];
        // WebSocket Clients
        this.clients = {};
        this.log.debug('Finished initializing platform:', this.config.name);
        // When this event is fired it means Homebridge has restored all cached accessories from disk.
        // Dynamic Platform plugins should only register new accessories after this event was fired,
        // in order to ensure they were not added to homebridge already. This event can also be used
        // to start discovery of new accessories.
        this.api.on('didFinishLaunching', () => {
            log.debug('Executed didFinishLaunching callback');
            new Websocket.WebSocketServer(this);
        });
    }
    /**
    * This function is invoked when homebridge restores cached accessories from disk at startup.
    * It should be used to setup event handlers for characteristics and update respective values.
    */
    configureAccessory(accessory) {
        this.log.info('Loading accessory from cache:', accessory.displayName);
        this.api.updatePlatformAccessories([accessory]);
        new Accessory.BertoAccessory(this, accessory);
        this.accessories.push(accessory);
    }
    receiveMessage(data) {
        var result;
        try {
            var packet = JSON.parse(data);
            this.log.debug("Data Received \n" + JSON.stringify(packet, null, 2));
            var topic = packet.topic;
            var payload = packet.payload;
            var id = packet.id;
            if (!topic || !payload || !id) {
                return this.formatResult(id, "Message Must Contain A Topic, Payload & Id", undefined, true);
            }
            switch (topic) {
                case "add":
                    if (Array.isArray(payload)) {
                        result = this.addAccessories(payload, id);
                    }
                    else {
                        result = this.addAccessory(payload, id);
                    }
                    break;
                case "del":
                    result = this.delAccessory(payload, id);
                    break;
                case "set":
                    result = this.setAccessory(payload, id);
                    break;
                case "get":
                    result = this.getAccessory(payload, id);
                    break;
                default:
                    result = this.formatResult(id, "Topic Is Not Supported", undefined, true);
            }
        }
        catch (err) {
            result = this.formatResult(id, data + " Not In JSON Format", undefined, true);
        }
        this.log.debug("Response " + JSON.stringify(result, null, 2));
        return result;
    }
    addAccessories(payload, id) {
        var results = new Array();
        var success = 0;
        var failure = 0;
        for (var index in payload) {
            var accessory = payload[index];
            var result = this.addAccessory(accessory, id);
            if (result.success) {
                success++;
            }
            else {
                failure++;
            }
            results.push(result);
        }
        return this.formatResult(id, "Multiple Accessories Added - " + success + " Successful, " + failure + " Rejected", results, false);
    }
    addAccessory(payload, id) {
        const uuid = this.api.hap.uuid.generate(payload.id.toString());
        this.log.debug("Adding Accessory With " + uuid + "\n" + JSON.stringify(payload, null, 2));
        const existingAccessory = this.accessories.find(payload => payload.UUID === uuid);
        if (existingAccessory) {
            existingAccessory.context.device = payload;
            this.api.updatePlatformAccessories([existingAccessory]);
            new Accessory.BertoAccessory(this, existingAccessory);
            return this.formatResult(id, "Accessory " + payload.id + " Updated With UUID " + uuid, { id: payload.id, uuid: uuid }, false);
        }
        else {
            const accessory = new this.api.platformAccessory(payload.name, uuid);
            accessory.context.device = payload;
            new Accessory.BertoAccessory(this, accessory);
            this.api.registerPlatformAccessories(Settings.PLUGIN_NAME, Settings.PLATFORM_NAME, [accessory]);
            this.accessories.push(accessory);
            return this.formatResult(id, "Accessory " + payload.id + " Added With UUID " + uuid, { id: payload.id, uuid: uuid }, false);
        }
    }
    delAccessory(payload, id) {
        for (var index = 0; index < this.accessories.length; index++) {
            if (this.accessories[index].context.device.id == payload.id || payload.id == "all") {
                var existingAccessory = this.accessories[index];
                this.api.unregisterPlatformAccessories(Settings.PLUGIN_NAME, Settings.PLATFORM_NAME, [existingAccessory]);
                this.accessories.splice(index, 1);
                index--;
            }
        }
        if (payload.id == "all") {
            return this.formatResult(id, "All Accessories Deleted", undefined, false);
        }
        else {
            return this.formatResult(id, "Accessory " + payload.id + " Deleted", undefined, false);
        }
    }
    setAccessory(payload, id) {
        const uuid = this.api.hap.uuid.generate(payload.id.toString());
        this.log.debug("Updating Accessory " + payload.id + "\n" + JSON.stringify(payload, null, 2));
        const existingAccessory = this.accessories.find(payload => payload.UUID === uuid);
        if (existingAccessory) {
            delete existingAccessory.context.timer;
            var service = existingAccessory.getService(this.Service[existingAccessory.context.device.service]);
            if (service) {
                for (var characteristic in payload.characteristics) {
                    this.log.debug('Updating Characteristic "' + characteristic + '" -> ' + payload.characteristics[characteristic]);
                    service.updateCharacteristic(this.Characteristic[characteristic], payload.characteristics[characteristic]);
                }
                return this.formatResult(id, payload.id + " Characteristics Updated", undefined, false);
            }
            else {
                return this.formatResult(id, 'This Accessory Does Not Have "' + existingAccessory.context.device.service + '" Service', undefined, true);
            }
        }
        else {
            return this.formatResult(id, "Accessory " + payload.id + " Does Not Exist", undefined, true);
        }
    }
    getAccessory(payload, id) {
        if (payload.id == "all") {
            var accessories = [];
            for (var index in this.accessories) {
                var existingAccessory = this.accessories[index].context.device;
                accessories.push(existingAccessory);
            }
            return this.formatResult(id, "All Accessories", accessories, false);
        }
        else {
            const uuid = this.api.hap.uuid.generate(payload.id.toString());
            this.log.debug("Getting Accessory " + payload.id + "\n" + JSON.stringify(payload, null, 2));
            const existingAccessory = this.accessories.find(payload => payload.UUID === uuid);
            if (existingAccessory) {
                return this.formatResult(id, "Accessory " + payload.id, existingAccessory.context.device, false);
            }
            else {
                return this.formatResult(id, "Accessory " + payload.id + " Does Not Exist", undefined, true);
            }
        }
    }
    formatResult(id, message, payload, error) {
        var result = {
            id: id,
            topic: "result",
            message: message,
            payload: payload,
            success: !error
        };
        if (error) {
            this.log.error(message);
        }
        this.log.debug(JSON.stringify(result, null, 2));
        return result;
    }
}
exports.BertoPlatform = BertoPlatform;
