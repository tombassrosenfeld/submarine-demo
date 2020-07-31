( async (d, w)=> {
   
    class BufferLoader {
        constructor(context, audioFiles, callback) {
            this.context = context;
            this.audioFiles = audioFiles;
            this.onload = callback;
            this.bufferList = new Array();
            this.loadCount = 0;
        }
        
        // TO DO - strip out API call so that assets are downloaded on page load

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
    
    class Switch {
        constructor(domSwitch) {
            this.domSwitch = domSwitch;
            this.context = null;
            this.input1 = null;
            this.input2 = null;
            this.output1 = null;
            this.output2 = null;
        }

        setDomSwitchEvent(){
            this.domSwitch.addEventListener('input', () => {
                if (this.context){
                    this.toggleOutput();
                }
            })
            return this;
        }

        setContext(context, input1, input2, channel1, channel2){
            
            //set context
            this.context = context;

            //create output gain nodes 
            this.output1 = context.createGain();
            this.output2 = context.createGain();

            // connect gain to destination
            this.output1.connect(channel1.output);
            this.output2.connect(channel2.output);

            // set initual gain levels
            this.output1.gain.value = +this.domSwitch.value === 0 ? 1 : 0;
            this.output2.gain.value = +this.domSwitch.value === 2 ? 1 : 0;

            //add buffers to inputs
            this.input1 = input1;
            this.input2 = input2;

            //connect inputs to output gain nodes
            this.input1.connect(this.output1);
            this.input2.connect(this.output2);

            return this;
        }
        // TO DO convert this to use data and have the output gain removed from the toggle so that user can channel select pre play
        
        toggleOutput() {
            if (+this.domSwitch.value === 0) {
                this.output1.gain.value = 1;
                this.output2.gain.value = 0;
            } else if (+this.domSwitch.value === 1) {
                this.output1.gain.value = 0;
                this.output2.gain.value = 0;
            } else if (+this.domSwitch.value === 2) {
                this.output1.gain.value = 0;
                this.output2.gain.value = 1;
            }

            return this;
        }

        getOutput(){
            return +this.domSwitch.value === 0 ? "Effect" : (this.domSwitch.value === 1 ? "Off" : "Octave");
        }
    }

    class Fader {
        constructor(fader) {
            this.fader = fader;
            this.context = null;
            this.output = null;
        }
        
        setFaderEvent() {
            this.fader.addEventListener('input', () => {
                if (this.context) {
                    this.setOutputGain();
                }
                return this;
            })
        }
        
        connectFader(context) {
            this.context = context;
            this.output = context.createGain();
            this.setOutputGain();
            this.output.connect(context.destination);
            return this;
        }
        
        setOutputGain() {
            this.output.gain.value = +this.fader.value / +this.fader.max;
            return this;
        }
    }

    const init = (audioBuffers) => {
        context = new AudioContext();

        const bufferLoader = new BufferLoader(
            context ,
            audioBuffers,
            finishedLoading
        );

        bufferLoader.load();
    }

    const finishedLoading = (bufferList) => {
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

    w.AudioContext = w.AudioContext || w.webkitAudioContext;
    const   submarine  = d.getElementById('sub-switches'),
            AWS ="https://submarine-audio.s3.eu-west-2.amazonaws.com",
            // in the source list, add the 12 single string tracks first (in groups of six rather than pairs of the same string) and the full recording last.
            sourceList = [

                // wet strings

                `${AWS}/e_effect.wav`,
                `${AWS}/a_effect.wav`,
                `${AWS}/g_effect.wav`,
                `${AWS}/d_effect.wav`,
                `${AWS}/b_effect.wav`,
                `${AWS}/ee_effect.wav`,
      
                // octave strings

                `${AWS}/e_octave.wav`,
                `${AWS}/a_octave.wav`,
                `${AWS}/g_octave.wav`,
                `${AWS}/d_octave.wav`,
                `${AWS}/b_octave.wav`,
                `${AWS}/ee_octave.wav`,

                // full acoustic

                `${AWS}/full_acoustic.wav`,
            ],
            switches = Array.from(d.getElementsByClassName('switch')).map((domSwitch, i) => addSwitch = new Switch(domSwitch)),
            controls = d.getElementById('js-controls'),
            play = d.getElementById('js-play'),
            pause = d.getElementById('js-pause'),
            video = d.getElementById('subVid'),
            dryFader = new Fader(d.getElementById('dry')), 
            channel1 = new Fader(d.getElementById('channel1')),
            channel2 = new Fader(d.getElementById('channel2')),
            faders = [dryFader, channel1, channel2];

    let context;

    const cacheAudio = (func) => {
        
    };
    const fetchAudio = async (urlArray) => {
        let requests =  urlArray.map((url, i) => fetch(url).catch((err) => console.log(err)));
        let responses = await Promise.all(requests);
        return responses;
    }

    let audioFiles = await fetchAudio(sourceList);

    faders.forEach(fader => fader.setFaderEvent());

    switches.forEach(jsSwitch => jsSwitch.setDomSwitchEvent());
   
    //  TO DO make it possible to play again after video ends. 
    
    controls.addEventListener('click', (e) => {
        const target = e.target;
        if (target === play && (!context || context.state === "closed")) {
            init(audioFiles);
            play.setAttribute('disabled', 'disabled');
            pause.removeAttribute('disabled');
        } else if (target === play && context.state === 'suspended') {
            context.resume().then( () => {
                play.setAttribute('disabled', 'disabled');
                pause.removeAttribute('disabled');
            });
            video.play();
        } else if ( target === pause && context.state === 'running' ) {
            context.suspend().then( () => {
                pause.setAttribute('disabled', 'disabled');
                play.removeAttribute('disabled');
            });
            video.pause();
        }
    })
})(document, window)