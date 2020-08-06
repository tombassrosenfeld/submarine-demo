export default class Fader {
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