export default class Switch {
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