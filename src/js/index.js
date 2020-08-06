import BufferLoader from "./BufferLoader.js";
import Fader from "./Fader.js";
import Switch from "./Switch.js";

( async (d, w)=> {

    const init = (audioBuffers) => {
        context = new AudioContext();

        const bufferLoader = new BufferLoader(
            context ,
            audioBuffers
        );

        bufferLoader.load();
    }

    w.AudioContext = w.AudioContext || w.webkitAudioContext;
    const   submarine  = d.getElementById('sub-switches'),
            AWS = "https://submarine-audio.s3.eu-west-2.amazonaws.com",
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
            switches = Array.from(d.getElementsByClassName('switch')).map((domSwitch, i) => new Switch(domSwitch)),
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