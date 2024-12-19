"use strict";

const Settings = require("./lib/settings");
const Platform = require("./lib/platform");

module.exports = (api) => {
    api.registerPlatform(Settings.PLATFORM_NAME, Platform.BertoPlatform);
};
