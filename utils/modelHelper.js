exports.applyGlobalHiddenFields = (model) => {
    if (model && model.prototype) {
        model.prototype.toJSON = function () {
            const values = Object.assign({}, this.get());
            const hiddenFields = ['LogID', 'PcID', 'Sflag', 'IsDelete', 'createdAt', 'updatedAt', 'Password', 'Token'];
            hiddenFields.forEach(field => delete values[field]);
            return values;
        };
    } else {
        console.error("❌ Failed to apply hidden fields: Model is undefined or invalid.");
    }
};