(d => {

    window.AudioContext = window.AudioContext||window.webkitAudioContext;
    let context = new AudioContext();



    class EffectsPedal {

        constructor(name, context) {
            this.name = name;
            this.context = context;
        }


        setContext(context) {
            this.context = context;
            return this;
        }

        getContext(){
          return this.context;  
        } 


    };


    // var stage = new pb.Stage(context);
    // var board = new pb.Board(context);

    // stage.setBoard(board);

    // var overdrive = new pb.stomp.Overdrive(context);
    // var reverb = new pb.stomp.Reverb(context);
    // var volume = new pb.stomp.Volume(context);
    // var cabinet = new pb.stomp.Cabinet(context);
    // var delay = new pb.stomp.Delay(context);

    // board.addPedals([overdrive, delay, reverb, volume, cabinet]);

    // overdrive.setDrive(.1);
    // overdrive.setTone(.4);
    // overdrive.setLevel(.6);
    // volume.setLevel(.8);
    // reverb.setLevel(.3);
    // delay.setDelayTimer(.2);
    // delay.setFeedbackGain(.7);

    // stage.render(document.getElementById('pedalboard'));
   

    // class BufferLoader {
    //     constructor(context, urlList, callback) {
    //         this.context = context;
    //         this.urlList = urlList;
    //         this.onload = callback;
    //         this.bufferList = new Array();
    //         this.loadCount = 0;
    //     }

    //     loadBuffer(url, index) {
    //         // Load buffer asynchronously
    //         var request = new XMLHttpRequest();
    //         request.open("GET", url, true);
    //         request.responseType = "arraybuffer";
    //         var loader = this;
    //         request.onload = function () {
    //             // Asynchronously decode the audio file data in request.response
    //             loader.context.decodeAudioData(request.response, function (buffer) {
    //                 if (!buffer) {
    //                     alert('error decoding file data: ' + url);
    //                     return;
    //                 }
    //                 loader.bufferList[index] = buffer;
    //                 if (++loader.loadCount == loader.urlList.length)
    //                     loader.onload(loader.bufferList);
    //             }, function (error) {
    //                 console.error('decodeAudioData error', error);
    //             });
    //         };
    //         request.onerror = function () {
    //             alert('BufferLoader: XHR error');
    //         };
    //         request.send();
    //     }
    //     load() {
    //         for (var i = 0; i < this.urlList.length; ++i)
    //             this.loadBuffer(this.urlList[i], i);
    //     }
    // }
    
    


    // const init = () => {
       

    //     const bufferLoader = new BufferLoader(
    //         context,
    //         [
    //             // '/src/audio/E_1.wav',
    //             // '/src/audio/A_1.wav',
    //             // '/src/audio/G_1.wav',
    //             // '/src/audio/D_1.wav',
    //             // '/src/audio/B_1.wav',
    //             // '/src/audio/EE_1.wav',
    //             '/src/audio/all-strings.wav',
    //             // '/src/audio/E8_1.wav',
    //         ],
    //         finishedLoading
    //     );

    //     bufferLoader.load();
    // }
        
    // window.onload = init;

    // const finishedLoading = (bufferList) => {

        
    //     const source1 = context.createBufferSource();
    //     // const source2 = context.createBufferSource();
    //     // const source3 = context.createBufferSource();
    //     // const source4 = context.createBufferSource();
    //     // const source5 = context.createBufferSource();
    //     // const source6 = context.createBufferSource();
    //     // const source7 = context.createBufferSource();
    //     // const source8 = context.createBufferSource();
    //     stage.input = source1;

    //     source1.buffer = bufferList[0];
    //     // source2.buffer = bufferList[1];
    //     // source3.buffer = bufferList[2];
    //     // source4.buffer = bufferList[3];
    //     // source5.buffer = bufferList[4];
    //     // source6.buffer = bufferList[5];
    //     // source7.buffer = bufferList[6];
    //     // source8.buffer = bufferList[7];

    //     source1.connect(context.destination);
    //     // source2.connect(context.destination);
    //     // source3.connect(context.destination);
    //     // source4.connect(context.destination);
    //     // source5.connect(context.destination);
    //     // source6.connect(context.destination);
    //     // source7.connect(context.destination);
    //     // source8.connect(context.destination);

    //     source1.start(0);
    //     // source2.start(0);
    //     // source3.start(0);
    //     // source4.start(0);
    //     // source5.start(0);
    //     // source6.start(0);
    //     // source7.start(0);
    //     // source8.start(0);
    // }

})(document)