import $ from "jquery";

import { AlgorithmControls } from "../../components/algorithm_controls";
import { Algorithm, AlgorithmState } from "../../algorithm/algorithm";

export class KruskalControls extends AlgorithmControls {

    algorithm: Algorithm;
    play_btn: JQuery<HTMLElement>;
    pause_btn: JQuery<HTMLElement>;
    stop_btn: JQuery<HTMLElement>;
    repeat_btn: JQuery<HTMLElement>;
    speed_slider: JQuery<HTMLElement>;

    constructor() {
        super();
        //const shadow = this.attachShadow({mode: 'open'});
        const template: HTMLTemplateElement =
            document.querySelector("#kruskal-control-template");
        const templateFrag = document.importNode(template.content, true);
        this.appendChild(templateFrag);

        $(this).addClass('container-fluid');
        this.speed_slider = $(this).find("#algorithm-speed");
        this.pause_btn = $(this).find("#btn-kruskal-pause");
        this.play_btn = $(this).find("#btn-kruskal-play");
        this.stop_btn = $(this).find("#btn-kruskal-stop");
        this.repeat_btn = $(this).find("#btn-kruskal-repeat");
        this.pause_btn.on('click', () => {
            this.algorithm?.pause();
        });
        this.play_btn.on('click', () => {
            this.algorithm?.resume();
        });
        this.stop_btn.on('click', () => {
            this.algorithm?.stop();
        });
        this.repeat_btn.on('click', () => {
            this.algorithm?.stop();
            this.algorithm?.execute();
        });
        this.speed_slider.on('change', () => {
            const value = this.speed_slider.val() as number;
            this.algorithm?.setSpeed(Number(value));
        });
    }

    setAlgorithm(algorithm: Algorithm) {
        algorithm.setStateChangeCallback(this.algorithmStateChanged.bind(this));
        this.algorithm = algorithm;
    }

    private algorithmStateChanged(newState: AlgorithmState) {
        switch (newState) {
            case "init":
                this.changeButtonState(this.play_btn, true);
                this.changeButtonState(this.pause_btn, false);
                this.changeButtonState(this.stop_btn, false);
                this.changeButtonState(this.repeat_btn, false);
                break;
            case "paused":
                this.changeButtonState(this.play_btn, true);
                this.changeButtonState(this.pause_btn, false);
                this.changeButtonState(this.stop_btn, true);
                this.changeButtonState(this.repeat_btn, false);
                break;
            case "running":
                this.changeButtonState(this.play_btn, false);
                this.changeButtonState(this.pause_btn, true);
                this.changeButtonState(this.stop_btn, true);
                this.changeButtonState(this.repeat_btn, false);
                break;
            case "stopped":
                this.changeButtonState(this.play_btn, false);
                this.changeButtonState(this.pause_btn, false);
                this.changeButtonState(this.stop_btn, false);
                this.changeButtonState(this.repeat_btn, true);
                break;
        }
    }

    private changeButtonState(button: JQuery<HTMLElement>, enabled: boolean) {
        if (enabled) {
            button.removeClass("disabled");
            button.removeAttr("disabled");
        } else {
            button.addClass("disabled");
            button.attr("disabled", "true");
        }
    }
}

customElements.define('kruskal-controls', KruskalControls);
