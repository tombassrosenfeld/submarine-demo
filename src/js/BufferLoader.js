export default class BufferLoader {
    constructor(context, audioFiles) {
        this.context = context;
        this.audioFiles = audioFiles;
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
                loader.finishedLoading(loader.bufferList);
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

    finishedLoading(bufferList) {
        // set up sources
        const sources = bufferList.map((buffer) => {
            const source = context.createBufferSource();
            source.buffer = buffer;
            return source;
        });

        faders.forEach((fader) => fader.connectFader(context));
        
        switches.forEach((jsSwitch, i) => jsSwitch.setContext(context, sources[i], sources[i + 6], channel1, channel2));
        sources[12].connect(dryFader.output);


        // start playback
        sources.forEach((source, i) => {
            source.start(0);
        });
        
        video.play();
        
        sources[12].onended = () => {
            pause.setAttribute('disabled', 'disabled');
            play.removeAttribute('disabled');
            context.close()
        }
    }
}