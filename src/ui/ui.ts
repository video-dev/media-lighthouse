const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
const width = canvas.width = window.innerWidth;
const height = canvas.height = window.innerHeight;

(async () => {
    let response;
    try {
        response = await fetch('http://localhost:3000/analyze');
    } catch (e) {
        console.error(e);
        return;
    }
    const levels = await response.json();
    console.log(levels);

    const datasets = levels[0].map((frag, index) => {
        const borderColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
        return [
            {
                backgroundColor: borderColor,
                borderColor,
                data: frag.audio.pts.flat(),
                fill: true,
                label: `Frag ${index} audio`,
            },
            {
                backgroundColor: borderColor,
                borderColor,
                data: frag.video.pts.flat(),
                fill: true,
                label: `Frag ${index} video`,
            },
        ];
    }).flat();

    const chart = new Chart(context, {
        data: {
            datasets,
        },
        type: 'bar',
    });
})();
