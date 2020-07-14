(d => {
    class BufferLoader {
        constructor(context, urlList, callback) {
            this.context = context;
            this.urlList = urlList;
            this.onload = callback;
            this.bufferList = new Array();
            this.loadCount = 0;
        }

        loadBuffer(url, index) {
            // Load buffer asynchronously
            var request = new XMLHttpRequest();
            request.open("GET", url, true);
            request.responseType = "arraybuffer";
            var loader = this;
            request.onload = function () {            
                // Asynchronously decode the audio file data in request.response
                loader.context.decodeAudioData(request.response, function (buffer) {
                    if (!buffer) {
                        alert('error decoding file data: ' + url);
                        return;
                    }
                    loader.bufferList[index] = buffer;
                    if (++loader.loadCount == loader.urlList.length)
                        loader.onload(loader.bufferList);
                }, function (error) {
                    console.error('decodeAudioData error', error);
                });
            };
            request.onerror = function () {
                alert('BufferLoader: XHR error');
            };
            request.send();
        }
        load() {
            for (var i = 0; i < this.urlList.length; ++i)
                this.loadBuffer(this.urlList[i], i);
        }
    }
    
    class Switch {
        constructor(domSwitch, label, currentOutput = 0) {
            this.currentOutput = currentOutput;
            this.domSwitch = domSwitch;
            this.label = label;
            this.context = null;
            this.input1 = null;
            this.input2 = null;
            this.output1 = null;
            this.output2 = null;
        }

        setDomClickEvent(){
            this.domSwitch.addEventListener('click', () => {
                this.toggleOutput();
                const output = this.currentOutput;
                
                this.domSwitch.style.justifyContent = output === 0 ? "flex-start" : (output === 1 ? "center" : "flex-end");
                this.label.textContent = this.getOutput();
            })
        }

        setContext( context, input1, input2){
            
            //set context
            this.context = context;

            //create output gain nodes 
            this.output1 = context.createGain();
            this.output2 = context.createGain();

            // connect gain to destination
            this.output1.connect(context.destination);
            this.output2.connect(context.destination);

            // set initual gain levels
            this.output1.gain.value = this.currentOutput === 0 ? 1 : 0;
            this.output2.gain.value = this.currentOutput === 2 ? 1 : 0;

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
            this.currentOutput = (this.currentOutput + 1) % 3;
            
            if (this.currentOutput === 0) {
                this.output1.gain.value = 1;
                this.output2.gain.value = 0;
            } else if (this.currentOutput === 1) {
                this.output1.gain.value = 0;
                this.output2.gain.value = 0;
            } else if (this.currentOutput === 2) {
                this.output1.gain.value = 0;
                this.output2.gain.value = 1;
            }

            return this;
        }

        getOutput(){
            return this.currentOutput === 0 ? "Dry" : (this.currentOutput === 1 ? "Off" : "Octave");
        }
    }

    window.AudioContext = window.AudioContext||window.webkitAudioContext;
    const   submarine  = d.getElementById('sub-switches'),
            AWS ="https://submarine-audio.s3.eu-west-2.amazonaws.com",
            // in the source list, add the 12 single string tracks first (in groups of six rather than pairs of the same string) and the full recording last.
            sourceList = [
                // wet strings

                // `${AWS}/e_effect.wav`,
                // `${AWS}/a_effect.wav`,
                // `${AWS}/g_effect.wav`,
                // `${AWS}/d_effect.wav`,
                // `${AWS}/b_effect.wav`,
                // `${AWS}/ee_effect.wav`,
               
                // dry strings

                `${AWS}/E_1.wav`,
                `${AWS}/A_1.wav`,
                `${AWS}/G_1.wav`,
                `${AWS}/D_1.wav`,
                `${AWS}/B_1.wav`,
                `${AWS}/EE_1.wav`,

                // octave strings

                `${AWS}/E8_1.wav`,
                `${AWS}/A8_1.wav`,
                `${AWS}/G8_1.wav`,
                `${AWS}/D8_1.wav`,
                `${AWS}/B8_1.wav`,
                `${AWS}/EE8_1.wav`,

                // full acoustic

                `${AWS}/iphone_audio.wav`,
            ],
            domSwitches = Array.from(d.getElementsByClassName('switch')),
            labels = Array.from(d.getElementsByClassName('js-switch-label')),
            controls = d.getElementById('js-controls'),
            play = d.getElementById('js-play'),
            pause = d.getElementById('js-pause'),
            switches = domSwitches.map( (domSwitch, i) => addSwitch = new Switch(domSwitch, labels[i])),
            video = d.getElementById('subVid');

    let context; 

    switches.forEach((jsSwitch, i) => jsSwitch.setDomClickEvent());

    const init = () => {
        const bufferLoader = new BufferLoader(
            context = new AudioContext(),
            sourceList,
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

        switches.forEach((jsSwitch, i) => {
            jsSwitch.setContext(context, sources[i], sources[i + 6] );
        });

        // start playback
        sources.forEach((source, i) => {
            source.start(0);
        });

        video.play();
    }

    let playing = false;

    controls.addEventListener('click', (e) => {
        const target = e.target;

        if (target === play && !playing) {
            playing = true;
            init();
            play.setAttribute('disabled', 'disabled');
            pause.removeAttribute('disabled');
        } else if (target === play && context.state === 'suspended') {
            context.resume().then( () => {
                play.setAttribute('disabled', 'disabled');
                pause.removeAttribute('disabled');
            });
            video.play();
        } else if ( target === pause ) {
            context.suspend().then( () => {
                pause.setAttribute('disabled', 'disabled');
                play.removeAttribute('disabled');
            });
            video.pause();
        }
    })

})(document)