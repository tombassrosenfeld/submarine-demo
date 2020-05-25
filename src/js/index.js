(d => {

    window.AudioContext = window.AudioContext||window.webkitAudioContext;
    const context = new AudioContext();
    
    class Switch {
        constructor(context, input1, input2, currentOutput = 0) {
            this.context = context;
            this.input1 = input1;
            this.input2 = input2;
            this.currentOutput = currentOutput;
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
        }

        getOutput(){
            return this.currentOutput === 0 ? "Dry" : (this.currentOutput === 1 ? "Off" : "Octave");
        }
    }

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

    const init = () => {
        const AWS ="https://submarine-audio.s3.eu-west-2.amazonaws.com";
        // in the source list, add the 12 single string tracks first (in groups of six rather than pairs of the same string) and the full recording last.
        const bufferLoader = new BufferLoader(
            context,
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
        const submarine  = d.getElementById('sub-switches');
        const domSwitches = Array.from(d.getElementsByClassName('switch'));
        const labels = Array.from(d.getElementsByClassName('js-switch-label'));

        // set up sources
        const sources = bufferList.map((buffer) => {
            const source = context.createBufferSource();
            source.buffer = buffer;
            return source;
        });

        // start playback
        sources.forEach((source, i) => {
            if (i < 6 ) { source.connect(context.destination); }
            source.start(0);
        });
        
        const switches = domSwitches.map( (domSwitch, i) => addSwitch = new Switch(context, sources[i], sources[i + 6]) );

        domSwitches.forEach((domSwitch, i) => {
            console.log(domSwitch);
            
            // domSwitch
            const jsSwitch = switches[i];
            
            domSwitch.addEventListener('click', () => {
                // console.log( switches[i]);
                switches[i].toggleOutput();
                const output = jsSwitch.currentOutput;
                console.log(output);
                
                domSwitch.style.justifyContent = output === 0 ? "flex-start" : (output === 1 ? "center" : "flex-end");
                console.log(labels[i]);
                labels[i].textContent = jsSwitch.getOutput();
            })
        })
    }

    
    

})(document)