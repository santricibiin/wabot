'use strict';

const fs = require('fs');
const path = require('path');
const mime = require('mime');
const fetch = require('node-fetch');
const { URL } = require('url');

/**
 * Media attached to a message
 * @param {string} mimetype MIME type of the attachment
 * @param {string} data Base64-encoded data of the file
 * @param {?string} filename Document file name. Value can be null
 * @param {?number} filesize Document file size in bytes. Value can be null
 */
class MessageMedia {
    constructor(mimetype, data, filename, filesize) {
        /**
         * MIME type of the attachment
         * @type {string}
         */
        this.mimetype = mimetype;

        /**
         * Base64-encoded data of the file
         * @type {string}
         */
        this.data = data;

        /**
         * Document file name. Value can be null
         * @type {?string}
         */
        this.filename = filename;

        /**
         * Document file size in bytes. Value can be null
         * @type {?number}
         */
        this.filesize = filesize;
    }

    /**
     * Creates a MessageMedia instance from a local file path
     * @param {string} filePath 
     * @returns {MessageMedia}
     */
    static fromFilePath(filePath) {
        const b64data = fs.readFileSync(filePath, {encoding: 'base64'});
        const mimetype = mime.getType(filePath); 
        const filename = path.basename(filePath);
        const filesize = fs.statSync(filePath).size;
        return new MessageMedia(mimetype, b64data, filename, filesize);
    }

    /**
     * Creates a MessageMedia instance from a URL
     * @param {string} url
     * @param {Object} [options]
     * @param {number} [options.unsafeMime=false]
     * @param {object} [options.client]
     * @param {object} [options.reqOptions]
     * @param {number} [options.reqOptions.size=0]
     * @returns {Promise<MessageMedia>}
     */
    static async fromUrl(url, options = {}) {
        let mimetype;

        if (!options.unsafeMime) {
            const pUrl = new URL(url);
            mimetype = mime.getType(pUrl.pathname);

            if (!mimetype)
                throw new Error('Unable to determine MIME type');
        }

        async function fetchData (url, options) {
            const reqOptions = Object.assign({ headers: { accept: 'image/* video/* text/* audio/*' } }, options);
            const response = await fetch(url, reqOptions);
            const mime = response.headers.get('Content-Type');
            let data = '';

            if (response.buffer) {
                data = (await response.buffer()).toString('base64');
            } else {
                const bArray = new Uint8Array(await response.arrayBuffer());
                bArray.forEach((b) => {
                    data += String.fromCharCode(b);
                });
                data = btoa(data);
            }
            
            return { data, mime };
        }

        const res = options.client
            ? (await options.client.pupPage.evaluate(fetchData, url, options.reqOptions))
            : (await fetchData(url, options.reqOptions));

        if (!mimetype)
            mimetype = res.mime;

        return new MessageMedia(mimetype, res.data, null);
    }
}

module.exports = MessageMedia;
