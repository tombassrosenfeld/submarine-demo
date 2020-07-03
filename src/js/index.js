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
                console.log(request);
                
                
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
        constructor(currentOutput = 0) {
            this.currentOutput = currentOutput;
        }

        context = null;
        input1 = null;
        input2 = null;

        setContext( context, input1, input2){
            this.context = context;
            this.input1 = input1;
            this.input2 = input2;
            return this;
        }

        toggleOutput() {
            this.currentOutput = (this.currentOutput + 1) % 3;
            
            if (this.currentOutput === 0) {
                this.input2.disconnect();
                this.input1.connect(context.destination);
            } else if (this.currentOutput === 1) {
                this.input2.disconnect();
                this.input1.disconnect();
            } else if (this.currentOutput === 2) {
                this.input1.disconnect();
                this.input2.connect(context.destination);
            }
            return this;
        }

        getOutput(){
            return this.currentOutput === 0 ? "Dry" : (this.currentOutput === 1 ? "Off" : "Octave");
        }
    }

    window.AudioContext = window.AudioContext||window.webkitAudioContext;
    const   submarine  = d.getElementById('sub-switches'),
            domSwitches = Array.from(d.getElementsByClassName('switch')),
            labels = Array.from(d.getElementsByClassName('js-switch-label')),
            controls = d.getElementById('js-controls'),
            play = d.getElementById('js-play'),
            pause = d.getElementById('js-pause'),
            switches = domSwitches.map( (domSwitch, i) => addSwitch = new Switch());

    let context; 

    domSwitches.forEach((domSwitch, i) => {

        const jsSwitch = switches[i];
        
        domSwitch.addEventListener('click', () => {
            switches[i].toggleOutput();
            const output = jsSwitch.currentOutput;
            
            domSwitch.style.justifyContent = output === 0 ? "flex-start" : (output === 1 ? "center" : "flex-end");
            labels[i].textContent = jsSwitch.getOutput();
        })
    })

    

    const init = () => {
        const AWS ="https://submarine-audio.s3.eu-west-2.amazonaws.com";
        // in the source list, add the 12 single string tracks first (in groups of six rather than pairs of the same string) and the full recording last.
        const bufferLoader = new BufferLoader(
            context = new AudioContext(),
            [
                `${AWS}/E_1.wav`,
                `${AWS}/A_1.wav`,
                `${AWS}/G_1.wav`,
                `${AWS}/D_1.wav`,
                `${AWS}/B_1.wav`,
                `${AWS}/EE_1.wav`,
                `${AWS}/E8_1.wav`,
                `${AWS}/A8_1.wav`,
                `${AWS}/G8_1.wav`,
                `${AWS}/D8_1.wav`,
                `${AWS}/B8_1.wav`,
                `${AWS}/EE8_1.wav`,
                `${AWS}/all-strings.wav`,
            ],
            finishedLoading
        );

        bufferLoader.load();
    }
        
    window.onload = init;

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
            if (i < 6 ) { source.connect(context.destination); }
            source.start(0);
        });
    }

    
    controls.addEventListener('click', (e) => {
        const target = e.target;

        if (target === play && context.state !== 'suspended') {
            init();
            play.setAttribute('disabled', 'disabled');
            pause.removeAttribute('disabled');
        } else if (target === play && context.state === 'suspended') {
            context.resume().then( () => {
                play.setAttribute('disabled', 'disabled');
                pause.removeAttribute('disabled');
            });
        } else if ( target === pause ) {
            context.suspend().then( () => {
                pause.setAttribute('disabled', 'disabled');
                play.removeAttribute('disabled');
            });
        }
    })

})(document)