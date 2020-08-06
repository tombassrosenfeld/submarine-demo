export default class BufferLoader {
    constructor(context, audioFiles, callback) {
        this.context = context;
        this.audioFiles = audioFiles;
        this.onload = callback;
        this.bufferList = new Array();
        this.loadCount = 0;
    }

    loadBuffer(buffer, index) {
        var loader = this;  
        loader.context.decodeAudioData(buffer, function (buffer) {
            if (!buffer) {
                alert('error decoding file data: ' + url);
                return;
            }
            loader.bufferList[index] = buffer;
            if (++loader.loadCount == loader.audioFiles.length)
                loader.onload(loader.bufferList);
        }, function (error) {
            console.error('decodeAudioData error', error);
        });
    }
    async load() {
        // clone responses so that they can be reused
        let audioCopies = this.audioFiles.map(audioFile => audioFile.clone());
        // extract array buffers from copied api response
        let audioBuffers = await Promise.all(audioCopies.map(audioFile => audioFile.arrayBuffer()));
        // run load buffer for each arrayBuffer
        audioBuffers.forEach((buffer, i) => this.loadBuffer(buffer, i));
    }
}