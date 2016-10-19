(() => {
    "use strict";

    const InvalidInput         = Symbol();
    const UnsupportedImageType = Symbol();

    const getByteOfSectionPosition = (section, bytePosition) => {
        const offsets = {
            imageDimensions: 8,
            dataStart:       12
        };

        return offsets[section] + bytePosition;
    };

    // The data structure constructor.
    let TgaFile = function () {
        /*
        * Data fields.
        *
        * - bytesPerPixel
        * - origin (lower left corner of the image because we force ImageDescriptor to be 0).
        *   - x
        *   - y
        * - dimensions
        *   - width
        *   - height
        * - data (ArrayBuffer of width * height * bytesPerPixel bytes)
        */
    };

    TgaFile.prototype.getPixel = function (x, y) {
        const position = (y * this.dimensions.width + x) * this.bytesPerPixel / 8;

        return {
            r: this.data.getUint8(position + 2),
            g: this.data.getUint8(position + 1),
            b: this.data.getUint8(position + 0)
        };
    };

    const readDataBytes = (tga, file) => {
        if (!tga.bytesPerPixel) {
            throw new Error("Header not read yet");
        }

        const dataSize = (
            tga.bytesPerPixel / 8
            * tga.dimensions.width
            * tga.dimensions.height
        );

        tga.data = new DataView(
            file,
            getByteOfSectionPosition("dataStart", 0),
            dataSize
        );
    };

    const checkFile = view => {
        // Compression not supported.
        if (view.getUint8(2) !== 2) {
            return UnsupportedImageType;
        }

        // Color maps not supported.
        if (view.getUint8(1) !== 0) {
            return UnsupportedImageType;
        }

        // Non-trivial image descriptor.
        if (view.getUint8(getByteOfSectionPosition("imageDimensions", 9)) !== 0) {
            return UnsupportedImageType;
        }
    };

    const setHeaderOnObject = (tga, view) => {
        tga.origin = {
            x: view.getUint16(getByteOfSectionPosition("imageDimensions", 0), true),
            y: view.getUint16(getByteOfSectionPosition("imageDimensions", 2), true)
        };

        tga.dimensions = {
            width:  view.getUint16(getByteOfSectionPosition("imageDimensions", 4), true),
            height: view.getUint16(getByteOfSectionPosition("imageDimensions", 6), true)
        };

        tga.bytesPerPixel = view.getUint8(getByteOfSectionPosition("imageDimensions", 8));
    };

    /*
    * Loads a TGA file
    *
    * The expected input is a blob.
    *
    * The return type is a TgaFile on success, an
    * error symbol on failure.
    *
    * Valid error symbols are exposed on the module
    * output and are the following:
    * - InvalidInput
    */
    module.exports = file => {
        if (!file || !(file instanceof ArrayBuffer)) {
            return InvalidInput;
        }

        let tga = new TgaFile();

        const view = new DataView(file);

        const fileError = checkFile(view);

        if (fileError) {
            return fileError;
        }

        setHeaderOnObject(tga, view);

        readDataBytes(tga, file);

        return tga;
    }

    Object.assign(module.exports, {
        InvalidInput, TgaFile, UnsupportedImageType
    });
})();
