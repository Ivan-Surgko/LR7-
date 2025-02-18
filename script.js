let slider = {
    slides: ['1.jpg', '2.jpg', '3.jpg'],
    i: 0,
    set: function(image) {
        document.getElementById("scr").style.backgroundImage = "url('slider/" + image + "')";
    },
    init: function() {
        this.set(this.slides[this.i]);
    },

    left: function() {
        this.i--;
        if (this.i < 0) this.i = this.slides.length - 1;
        this.set(this.slides[this.i]);
    },
    right: function() {
        this.i++;
        if (this.i == this.slides.length) this.i = 0;
        this.set(this.slides[this.i]);
    }
}
window.onload = function() {
    slider.init();
    setInterval(function() { slider.right(); }, 5000);

    let btn1 = document.querySelector('.left')
    btn1.addEventListener('click', () => slider.left());

    let btn2 = document.querySelector('.right')
    btn2.addEventListener('click', () => slider.right());

}