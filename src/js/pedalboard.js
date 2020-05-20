const load = async LIVE => {
    const DEV = false;
    const ctx = new window.AudioContext();
    const audio = document.querySelector('audio');
    const $pedalboard = document.querySelector('.pedalboard');
    let buffer = null;
  
    const lerp = (x, y, a) => x * (1 - a) + y * a;
    const invlerp = (a, b, v) => clamp((v - a) / (b - a));
    const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  
    if (!audio) {
      return;
    }
  
    const updatePot = pot => {
      return event => {
        pot.value = event.target.value;
      };
    };
  
    const setKnob = (knob, min, max, value) => {
      const decimal = invlerp(min, max, value);
      const squashed = lerp(0, 300, decimal);
      knob.style.setProperty('--percentage', squashed);
    };
  
    const createRotaryKnob = ({
      pedal,
      name,
      label,
      min = 0,
      max = 1,
      step = 0.01,
      value = 0,
      onInput
    }) => {
      const type = pedal.dataset.type;
      const wrapper = document.createElement('li');
  
      wrapper.innerHTML = `<label for="${type}_${name}">${label}</label>
      <input type="range" id="${type}_${name}" name="${name}" min="${min}" max="${max}" value="${value}" step="${step}" />
      <button type="button" class="pedal__knob" style="--percentage: 10"></button>`;
  
      const knob = wrapper.querySelector('button');
  
      if (onInput) {
        const input = wrapper.querySelector('input');
        setKnob(knob, min, max, value);
  
        input.addEventListener('input', event => {
          onInput(event);
          setKnob(knob, min, max, event.target.value);
        });
  
        let engaged = false;
        let prevY = null;
  
        const engage = event => {
          engaged = true;
          let prevY = event.clientY;
          event.preventDefault();
        };
  
        const disengage = event => {
          engaged = false;
        };
  
        const rotaryMove = Y => {
          if (engaged) {
            if (prevY - Y === 0) {
              return;
            }
  
            const goingUp = prevY >= Y;
            prevY = Y;
            let diff = min < 0 ? min / -50 : max / 50;
            diff = diff < step ? step : diff;
            input.value = Number(input.value) + diff * (goingUp ? 1 : -1);
  
            input.dispatchEvent(
              new Event('input', {
                bubbles: true,
                cancelable: true
              })
            );
          }
        };
  
        knob.addEventListener('mousedown', engage);
        window.addEventListener('mouseup', disengage);
        knob.addEventListener('touchstart', engage);
        window.addEventListener('touchend', disengage);
  
        // Add touch support
        window.addEventListener('mousemove', event => {
          rotaryMove(event.clientY);
        });
  
        window.addEventListener('touchmove', event => {
          rotaryMove(event.touches[0].clientY);
        });
      }
  
      const $list = pedal.querySelector('ul');
      if ($list) {
        $list.appendChild(wrapper);
      }
  
      return knob;
    };
  
    const createSwitch = ({
      pedal,
      name,
      label,
      value = 0,
      onInput,
      options = []
    }) => {
      const type = pedal.dataset.type;
      const wrapper = document.createElement('li');
  
      wrapper.innerHTML = `<label for="${type}_${name}">${label}</label>
      <select id="${type}_${name}" name="${name}"/>
        ${options
          .map(({ label, value: val }) => {
            return `<option value="${val}"${
              value === val ? ' selected' : ''
            }>${label}</option>`;
          })
          .join('')}
      </select>`;
  
      if (onInput) {
        wrapper.querySelector('select').addEventListener('change', onInput);
      }
  
      const $list = pedal.querySelector('ul');
      if ($list) {
        $list.appendChild(wrapper);
      }
  
      return wrapper;
    };
  
    const createPedal = ({ name, label, toggle, active, index = 0 }) => {
      const pedal = document.createElement('div');
      pedal.innerHTML = `<ul class="pedal__controls"></ul>
      <div class="pedal__on-off">
        <input id="${name}_active" type="checkbox" ${active ? 'checked' : ''} />
        <output class="pedal__led"></output>
        <label for="${name}_active" class="pedal__button">Enable / Disable</label>
      </div>
      <h2>${label}</h2>
      <span class="pedal__jack"></span>
      <span class="pedal__jack"></span>`;
  
      const input = pedal.querySelector('[type="checkbox"]');
      input.addEventListener('change', () => toggle());
  
      window.addEventListener('MIDI', ({ detail }) => {
        if (detail === index) {
          input.checked = !input.checked;
          toggle();
        }
      });
  
      pedal.classList.add('pedal');
      pedal.classList.add(`pedal--${name}`);
      pedal.dataset.type = name;
  
      return pedal;
    };
  
    const toggleOnOff = (dry, wet) => {
      return on => {
        const active = on === undefined ? !!dry.gain.value : on;
  
        if (active) {
          wet.gain.value = 1;
          dry.gain.value = 0;
        } else {
          wet.gain.value = 0;
          dry.gain.value = 1;
        }
      };
    };
  
    const createInputSwitch = (input, output, active = false) => {
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const out = ctx.createGain();
  
      const toggle = toggleOnOff(dry, wet);
      toggle(active);
  
      input.connect(dry);
      output.connect(wet);
  
      dry.connect(out);
      wet.connect(out);
  
      return [out, toggle];
    };
  
    const createInputSwitchWithTails = (input, active = false) => {
      const dry = ctx.createGain();
      const fxSend = ctx.createGain();
      const fxReturn = ctx.createGain();
      const sum = ctx.createGain();
  
      const toggle = toggleOnOff(dry, fxSend);
      toggle(active);
  
      input.connect(dry);
      input.connect(fxSend);
  
      dry.connect(sum);
      fxReturn.connect(sum);
  
      return [fxSend, fxReturn, sum, toggle];
    };
  
    const delayPedal = function(input, index) {
      // Default settings
      const defaults = {
        tone: 2200,
        speed: 0.45,
        mix: 0.4,
        feedback: 0.4,
        active: true,
        maxDelay: 1.5
      };
  
      // Create audio nodes
      const delayGain = ctx.createGain();
      const feedback = ctx.createGain();
      const delay = ctx.createDelay(defaults.maxDelay);
      const filter = ctx.createBiquadFilter();
  
      const [fxSend, fxReturn, output, toggle] = createInputSwitchWithTails(
        input,
        defaults.active
      );
  
      // Set default values
      delay.delayTime.value = defaults.speed;
      feedback.gain.value = defaults.feedback;
      delayGain.gain.value = defaults.mix;
      filter.frequency.value = defaults.tone;
  
      // Connect the nodes togther
      fxSend.connect(fxReturn);
      fxSend.connect(filter);
      filter.connect(delay);
      delay.connect(feedback);
      delay.connect(delayGain);
      feedback.connect(delay);
      delayGain.connect(fxReturn);
  
      // Create the DOM nodes
      const pedal = createPedal({
        name: 'delay',
        label: 'setTimeout',
        toggle,
        active: defaults.active,
        index
      });
  
      createRotaryKnob({
        pedal,
        name: 'mix',
        label: 'Mix',
        onInput: updatePot(delayGain.gain),
        value: defaults.mix
      });
  
      createRotaryKnob({
        pedal,
        name: 'feedback',
        label: 'Feedback',
        max: 0.7,
        onInput: updatePot(feedback.gain),
        value: defaults.feedback
      });
  
      createRotaryKnob({
        pedal,
        name: 'speed',
        label: 'Speed',
        max: defaults.maxDelay,
        onInput: updatePot(delay.delayTime),
        value: defaults.speed
      });
  
      createRotaryKnob({
        pedal,
        name: 'tone',
        label: 'Tone',
        min: 200,
        max: 6000,
        step: 200,
        onInput: updatePot(filter.frequency),
        value: defaults.tone
      });
  
      $pedalboard.appendChild(pedal);
  
      return output;
    };
  
    const tremoloPedal = function(input, index) {
      // Default settings
      const defaults = {
        speed: 3,
        depth: 0.3,
        wave: 'sine',
        active: true
      };
  
      // Create audio nodes
      const sum = ctx.createGain();
      const lfo = ctx.createOscillator();
      const tremolo = ctx.createGain();
      const depthIn = ctx.createGain();
      const depthOut = ctx.createGain();
  
      const [output, toggle] = createInputSwitch(input, sum, defaults.active);
  
      // Set default values
      lfo.frequency.value = defaults.speed;
      depthIn.gain.value = 1 - defaults.depth;
      depthOut.gain.value = defaults.depth;
  
      // Connect the nodes togther
      lfo.connect(tremolo.gain);
      lfo.start();
      input.connect(tremolo);
      tremolo.connect(depthOut);
      depthOut.connect(sum);
      input.connect(depthIn);
      depthIn.connect(sum);
  
      // Create the DOM nodes
      const pedal = createPedal({
        name: 'tremolo',
        label: '&lt;blink /&gt;',
        toggle,
        active: defaults.active,
        index
      });
  
      createRotaryKnob({
        pedal,
        name: 'speed',
        label: 'Speed',
        max: 4,
        onInput: updatePot(lfo.frequency),
        value: defaults.speed
      });
  
      createRotaryKnob({
        pedal,
        name: 'depth',
        label: 'Depth',
        value: defaults.depth,
        onInput: event => {
          depthIn.gain.value = 1 - Number(event.target.value);
          depthOut.gain.value = Number(event.target.value);
        }
      });
  
      createSwitch({
        pedal,
        name: 'wave',
        label: 'Wave',
        value: defaults.wave,
        onInput: updatePot(lfo.type),
        options: [
          { label: 'Sine', value: 'sine' },
          { label: 'Square', value: 'square' },
          { label: 'Sawtooth', value: 'sawtooth' },
          { label: 'Triangle', value: 'triangle' }
        ]
      });
  
      $pedalboard.appendChild(pedal);
  
      return output;
    };
  
    const chorusPedal = function(input, index) {
      // Default settings
      const defaults = {
        speed: 1,
        mix: 0.3,
        active: false
      };
  
      // Create audio nodes
      const sum = ctx.createGain();
      const chorus = ctx.createDelay();
      const chorus2 = ctx.createDelay();
      const chorus3 = ctx.createDelay();
      const mixIn = ctx.createGain();
      const mixOut = ctx.createGain();
  
      const [output, toggle] = createInputSwitch(input, sum, defaults.active);
  
      // Set default values
      mixIn.gain.value = 1 - defaults.mix;
      mixOut.gain.value = defaults.mix;
  
      const step = 0.001;
      const min = 0.015;
      const max = 0.025;
      let timeModulation = min;
      let goingUp = true;
      chorus.delayTime.value = timeModulation;
      chorus2.delayTime.value = timeModulation + step;
      chorus3.delayTime.value = timeModulation + step + step;
  
      const modulate = () => {
        if (goingUp) {
          timeModulation += step;
          if (timeModulation >= max) {
            goingUp = false;
          }
        } else {
          timeModulation -= step;
  
          if (timeModulation <= min) {
            goingUp = true;
          }
        }
  
        chorus.delayTime = timeModulation;
        chorus2.delayTime = timeModulation + step;
        chorus3.delayTime = timeModulation + step + step;
        requestAnimationFrame(modulate);
      };
  
      requestAnimationFrame(modulate);
  
      // Connect the nodes togther
      input.connect(chorus);
      input.connect(chorus2);
      input.connect(chorus3);
      chorus.connect(mixOut);
      chorus2.connect(mixOut);
      chorus3.connect(mixOut);
      mixOut.connect(sum);
      input.connect(mixIn);
      mixIn.connect(sum);
  
      // Create the DOM nodes
      const pedal = createPedal({
        name: 'chorus',
        label: 'float',
        toggle,
        active: defaults.active,
        index
      });
  
      createRotaryKnob({
        pedal,
        name: 'mix',
        label: 'Mix',
        max: 0.5,
        value: defaults.mix,
        onInput: event => {
          mixIn.gain.value = 1 - Number(event.target.value);
          mixOut.gain.value = Number(event.target.value);
        }
      });
  
      $pedalboard.appendChild(pedal);
  
      return output;
    };
  
    const boostPedal = function(input, index) {
      // Default settings
      const defaults = {
        gain: 1.5,
        active: false
      };
  
      // Create audio nodes
      const sum = ctx.createGain();
      const boost = ctx.createGain();
  
      const [output, toggle] = createInputSwitch(input, sum, defaults.active);
  
      // Set default values
      boost.gain.value = defaults.gain;
  
      // Connect the nodes togther
      input.connect(boost);
      boost.connect(sum);
  
      // Create the DOM nodes
      const pedal = createPedal({
        name: 'boost',
        label: '!important',
        toggle,
        active: defaults.active,
        index
      });
  
      createRotaryKnob({
        pedal,
        name: 'boost',
        label: 'Boost',
        max: 3,
        onInput: updatePot(boost.gain),
        value: defaults.gain
      });
  
      $pedalboard.appendChild(pedal);
  
      return output;
    };
  
    const wahPedal = function(input, index) {
      // Default settings
      const defaults = {
        frequency: 1000,
        q: 1000,
        boost: 1.5,
        active: false,
        filterMin: 100,
        filterMax: 1500
      };
  
      // Create audio nodes
      const sum = ctx.createGain();
      const boost = ctx.createGain();
      const filter = ctx.createBiquadFilter();
  
      const [output, toggle] = createInputSwitch(input, sum, defaults.active);
  
      // Set default values
      boost.gain.value = defaults.boost;
      filter.frequency.value = defaults.frequency;
      filter.type = 'bandpass';
      filter.q = defaults.q;
      filter.gain.value = -40;
  
      // Connect the nodes togther
      input.connect(boost);
      boost.connect(filter);
      filter.connect(sum);
  
      // Create the DOM nodes
      const pedal = createPedal({
        name: 'wah',
        label: '.filter()',
        toggle,
        active: defaults.active,
        index
      });
  
      const $filter = createRotaryKnob({
        pedal,
        name: 'filter',
        label: 'Filter',
        min: defaults.filterMin,
        max: defaults.filterMax,
        step: 20,
        onInput: updatePot(filter.frequency),
        value: defaults.frequency
      });
  
      window.addEventListener('MIDIEXP', ({ detail }) => {
        const decimal = invlerp(0, 127, detail);
        const val = lerp(defaults.filterMin, defaults.filterMax, decimal);
        filter.frequency.value = val;
        setKnob($filter, 0, 127, detail);
      });
  
      createRotaryKnob({
        pedal,
        name: 'q',
        label: 'Q',
        min: 0.001,
        max: 1000,
        step: 10,
        onInput: updatePot(filter.q),
        value: defaults.q
      });
  
      createRotaryKnob({
        pedal,
        name: 'boost',
        label: 'Boost',
        max: 4,
        onInput: updatePot(boost.gain),
        value: defaults.boost
      });
  
      $pedalboard.appendChild(pedal);
  
      return output;
    };
  
    const reverbPedal = function(input, index) {
      // Default settings
      const defaults = {
        mix: 0.4,
        tone: 4000,
        active: true
      };
  
      // Create audio nodes
      const reverb = ctx.createConvolver();
      const tone = ctx.createBiquadFilter();
      const mixIn = ctx.createGain();
      const mixOut = ctx.createGain();
  
      const [fxSend, fxReturn, output, toggle] = createInputSwitchWithTails(
        input,
        defaults.active
      );
  
      // Set default values
      mixIn.gain.value = 1 - defaults.mix;
      mixOut.gain.value = defaults.mix;
      tone.frequency.value = defaults.tone;
  
      // Connect the nodes togther
      fxSend.connect(mixIn);
      mixIn.connect(fxReturn);
  
      fxSend.connect(reverb);
      reverb.connect(tone);
      tone.connect(mixOut);
      mixOut.connect(fxReturn);
  
      reverb.buffer = buffer;
  
      // Create the DOM nodes
      const pedal = createPedal({
        name: 'reverb',
        label: 'spacer.gif',
        toggle,
        active: defaults.active,
        index
      });
  
      createRotaryKnob({
        pedal,
        name: 'mix',
        label: 'Mix',
        max: 1,
        value: defaults.mix,
        onInput: event => {
          mixIn.gain.value = 1 - Number(event.target.value);
          mixOut.gain.value = Number(event.target.value);
        }
      });
  
      createRotaryKnob({
        pedal,
        name: 'tone',
        label: 'Tone',
        min: 200,
        max: 6000,
        step: 200,
        onInput: updatePot(tone.frequency),
        value: defaults.tone
      });
  
      $pedalboard.appendChild(pedal);
  
      return output;
    };
  
    const compressorPedal = function(input, index) {
      // Default settings
      const defaults = {
        mix: 0.85,
        threshold: -30,
        attack: 0.1,
        release: 0.5,
        active: false
      };
  
      // Create audio nodes
      const sum = ctx.createGain();
      const mixIn = ctx.createGain();
      const mixOut = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
  
      const [output, toggle] = createInputSwitch(input, sum, defaults.active);
  
      // Set default values
      compressor.threshold.value = defaults.threshold;
      compressor.attack.value = defaults.attack;
      compressor.release.value = defaults.release;
      mixIn.gain.value = 1 - defaults.mix;
      mixOut.gain.value = defaults.mix;
  
      // Connect the nodes togther
      input.connect(compressor);
      compressor.connect(mixOut);
      mixOut.connect(sum);
      input.connect(mixIn);
      mixIn.connect(sum);
  
      // Create the DOM nodes
      const pedal = createPedal({
        name: 'compressor',
        label: 'Smoosh',
        toggle,
        active: defaults.active,
        index
      });
  
      createRotaryKnob({
        pedal,
        name: 'mix',
        label: 'Mix',
        value: defaults.mix,
        onInput: event => {
          mixIn.gain.value = 1 - Number(event.target.value);
          mixOut.gain.value = Number(event.target.value);
        }
      });
  
      createRotaryKnob({
        pedal,
        min: -100,
        max: 0,
        name: 'threshold',
        label: 'Threshold',
        value: defaults.threshold,
        onInput: updatePot(compressor.threshold)
      });
  
      createRotaryKnob({
        pedal,
        name: 'attack',
        label: 'Attack',
        value: defaults.attack,
        onInput: updatePot(compressor.attack)
      });
  
      createRotaryKnob({
        pedal,
        name: 'release',
        label: 'Release',
        value: defaults.release,
        onInput: updatePot(compressor.release)
      });
  
      $pedalboard.appendChild(pedal);
  
      return output;
    };
  
    const overdrivePedal = function(input, index) {
      // Default settings
      const defaults = {
        active: false,
        drive: 30,
        volume: 1
      };
  
      // Create audio nodes
      const sum = ctx.createGain();
      const volume = ctx.createGain();
      const overdrive = ctx.createWaveShaper();
  
      const [output, toggle] = createInputSwitch(input, sum, defaults.active);
  
      // Set default values
      // @link https://developer.mozilla.org/en-US/docs/Web/API/WaveShaperNode
      function makeDistortionCurve(amount) {
        var k = typeof amount === 'number' ? amount : 50,
          n_samples = 44100,
          curve = new Float32Array(n_samples),
          deg = Math.PI / 180,
          i = 0,
          x;
        for (; i < n_samples; ++i) {
          x = (i * 2) / n_samples - 1;
          curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
      }
  
      overdrive.curve = makeDistortionCurve(defaults.drive);
      overdrive.oversample = '4x';
      volume.gain.value = 1;
  
      // Connect the nodes togther
      input.connect(overdrive);
      overdrive.connect(volume);
      volume.connect(sum);
  
      // Create the DOM nodes
      const pedal = createPedal({
        name: 'overdrive',
        label: 'Math.pow()',
        toggle,
        active: defaults.active,
        index
      });
  
      createRotaryKnob({
        pedal,
        name: 'drive',
        label: 'Drive',
        value: defaults.drive,
        min: 0,
        max: 100,
        onInput: event => {
          overdrive.curve = makeDistortionCurve(Number(event.target.value));
        }
      });
  
      createRotaryKnob({
        pedal,
        name: 'volume',
        label: 'Volume',
        value: defaults.volume,
        max: 3,
        onInput: updatePot(volume.gain)
      });
  
      $pedalboard.appendChild(pedal);
  
      return output;
    };
  
    const loopPedal = function(input, index) {
      // Default settings
      const defaults = {
        volume: 1
      };
  
      // Create audio nodes
      const output = ctx.createGain();
      const mixIn = ctx.createGain();
      const volume = ctx.createGain();
  
      const streamer = ctx.createMediaStreamDestination();
      const recorder = new MediaRecorder(streamer.stream);
      const audio = document.createElement('audio');
      const STATES = {
        empty: 'empty',
        recording: 'recording',
        prepared: 'prepared',
        idle: 'idle',
        cease: 'cease'
      };
      let recordHead = STATES.empty;
  
      recorder.addEventListener('dataavailable', e => {
        audio.src = URL.createObjectURL(e.data);
  
        if (recordHead === STATES.cease) {
          recordHead = STATES.idle;
          led.dataset.state = '';
          return;
        }
  
        audio.play();
        led.dataset.state = 'playing';
      });
  
      audio.addEventListener('ended', e => {
        if (recorder.state === 'recording') {
          recordHead = STATES.idle;
          recorder.stop();
        }
  
        if (recordHead === STATES.cease) {
          recordHead = STATES.idle;
          led.dataset.state = '';
          return;
        }
  
        if (recordHead === STATES.prepared) {
          recordHead = STATES.recording;
          recorder.start();
        }
  
        e.target.play();
        led.dataset.state =
          recordHead === STATES.recording ? 'overdubbing' : 'playing';
      });
  
      // Set default values
      volume.gain = defaults.volume;
  
      // Connect the nodes togther
      input.connect(output);
      input.connect(mixIn);
      mixIn.connect(streamer);
      audioOut = ctx.createMediaElementSource(audio);
      audioOut.connect(volume);
      audioOut.connect(mixIn); // Loop back around for overdubbing
      volume.connect(output);
  
      const name = 'looper';
      const pedal = document.createElement('div');
      pedal.innerHTML = `<ul class="pedal__controls"></ul>
      <div class="pedal__on-off">
        <output class="pedal__led"></output>
        <div class="pedal__double-button">
          <button type="button" class="pedal__button" data-label aria-label="Loop"></button>
          <button type="button" class="pedal__button" data-label aria-label="Stop"></button>
        </div>
      </div>
      <h2>for(loop)</h2>
      <span class="pedal__jack"></span>
      <span class="pedal__jack"></span>`;
  
      pedal.classList.add('pedal');
      pedal.classList.add(`pedal--${name}`);
      pedal.dataset.type = name;
  
      const cassette = document.createElement('div');
      cassette.classList.add('cassette');
      cassette.innerHTML = `<span class="cassette__window"></span>
      <span class="cassette__head"></span>
      <span class="cassette__head"></span>`;
      pedal.appendChild(cassette);
  
      const led = pedal.querySelector('.pedal__led');
      const loopButton = pedal.querySelector('[aria-label="Loop"]');
      const stopButton = pedal.querySelector('[aria-label="Stop"]');
      led.dataset.state = '';
  
      loopButton.addEventListener('click', () => {
        if (recordHead === STATES.empty) {
          if (recorder.state === 'inactive') {
            led.dataset.state = 'recording';
            recorder.start();
          } else {
            recordHead = STATES.idle;
            recorder.stop();
          }
        } else {
          recordHead = STATES.prepared;
        }
      });
  
      stopButton.addEventListener('click', () => {
        if (recorder.state === 'recording') {
          recordHead = STATES.cease;
          recorder.stop();
          return;
        }
  
        recordHead = audio.paused ? STATES.idle : STATES.cease;
        led.dataset.state = audio.paused ? 'playing' : '';
        audio[audio.paused ? 'play' : 'pause']();
        audio.currentTime = 0;
      });
  
      window.addEventListener('MIDI', ({ detail }) => {
        if (detail === 121) {
          loopButton.dispatchEvent(
            new Event('click', {
              bubbles: true,
              cancelable: true
            })
          );
        } else if (detail === 122) {
          stopButton.dispatchEvent(
            new Event('click', {
              bubbles: true,
              cancelable: true
            })
          );
        } else if (detail === 123) {
          audio.pause();
          audio.currentTime = 0;
          audio.removeAttribute('src');
          recordHead = STATES.empty;
          led.dataset.state = '';
        }
      });
  
      createRotaryKnob({
        pedal,
        name: 'volume',
        label: 'Volume',
        max: 2,
        value: defaults.volume,
        onInput: updatePot(volume.gain)
      });
  
      $pedalboard.appendChild(pedal);
  
      return output;
    };
  
    const onError = (message = '') => {
      const error = document.createElement('div');
      error.innerHTML = message;
      error.classList.add('error');
      document.body.appendChild(error);
    };
  
    const onMidiMessage = ({ data }) => {
      if (data[0] === 144) {
        window.dispatchEvent(new CustomEvent('MIDI', { detail: data[1] }));
      }
  
      if (data[0] === 176) {
        window.dispatchEvent(new CustomEvent('MIDIEXP', { detail: data[2] }));
      }
    };
  
    await fetch('/assets/Conic Long Echo Hall.wav')
      .then(response => response.arrayBuffer())
      .then(data => {
        return ctx.decodeAudioData(data, b => {
          buffer = b;
        });
      })
      .catch(e => onError('Failed to load reverb impulse'));
  
    try {
      const midiCtx = await navigator.requestMIDIAccess();
  
      midiCtx.inputs.forEach(entry => {
        entry.onmidimessage = onMidiMessage;
      });
    } catch (e) {
      console.log('No midi connectivity');
    }
  
    let stream;
    if (LIVE) {
      stream = await navigator.mediaDevices
        .getUserMedia({
          audio: true,
          video: false
        })
        .catch(e => onError("Couldn't connect to your microphone 😔"));
    }
  
    let source;
  
    if (LIVE) {
      source = ctx.createMediaStreamSource(stream);
    } else {
      source = ctx.createMediaElementSource(audio);
      audio.muted = false;
      audio.volume = DEV ? 0 : 1;
      audio.currentTime = 2;
      audio.play();
    }
  
    const pedals = [
      wahPedal,
      compressorPedal,
      overdrivePedal,
      boostPedal,
      chorusPedal,
      delayPedal,
      reverbPedal,
      tremoloPedal,
      loopPedal
    ];
  
    const output = pedals.reduce((input, pedal, index) => {
      return pedal(input, index + 1);
    }, source);
  
    output.connect(ctx.destination);
  };
  
  (() => {
    const getStarted = ({ target }) => {
      document.body.classList.remove('loading');
      setTimeout(() => {
        target.parentNode.remove();
        load(target.classList.contains('start--live'));
      }, 1000);
    };
  
    [].forEach.call(document.querySelectorAll('.start'), el => {
      el.addEventListener('click', getStarted);
    });
  })();