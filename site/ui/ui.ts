const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
const width = canvas.width = window.innerWidth;
const height = canvas.height = window.innerHeight;

const randomHexColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16);

function create2DPtsPoint(pts) {
    return {
        x: pts / 90000,
        y: pts,
    };
}

function splitAV(fragments) {
    const audio = [];
    const video = [];
    fragments.forEach((frag) => {
        audio.push(frag.data.audio.pts);
        video.push(frag.data.video.pts);
    });

    return { audio, video };
}

function createLineSet(level) {
    const { audio, video } = splitAV(level.fragments);
    return [
        {
            borderColor: randomHexColor(),
            cubicInterpolationMode: 'monotone',
            data: audio.flat(),
            fill: false,
            label: 'Audio',
            type: 'line',
        },
        {
            borderColor: randomHexColor(),
            cubicInterpolationMode: 'monotone',
            data: video.flat(),
            fill: false,
            label: 'Video',
            type: 'line',
        },
    ];
}

function createScatterSet(level) {
    return createLineSet(level)
        .map((set) => {
            set.data = set.data.flat().map(create2DPtsPoint);
            set.type = 'scatter';
            return set;
    });
}

function createBarSet(level) {
    const { audio, video } = splitAV(level.fragments);
    barSet.map((set) => {
        const diff = [];
        set.data.forEach((val, index) => {
            if (set.data[index + 1]) {
                diff.push(set.data[index + 1] - val);
            }
        });
        set.data = diff;
        set.type = 'bar';
    });
    return barSet;
}

function createPerFragDataset(level) {
    const borderColor = randomHexColor();
    return level.fragments.map((frag, index) => {
        return [
            {
                backgroundColor: borderColor,
                borderColor,
                data: frag.data.audio.pts.flat(),
                fill: true,
                label: `Frag ${index} audio`,
            },
            {
                backgroundColor: borderColor,
                borderColor,
                data: frag.data.video.pts.flat(),
                fill: true,
                label: `Frag ${index} video`,
            },
        ];
    }).flat();
}

(async () => {
    let response;
    try {
        response = await fetch(
            'http://localhost:3000/report?stream=https%3A%2F%2Fvideo-dev.github.io%2Fstreams%2Fpts_shift%2Fmaster.m3u8'
        );
    } catch (e) {
        console.error(e);
        return;
    }
    const report = await response.json();
    console.log(report);

    const lineDataSet = createLineSet(report.levels[0]);
    const scatterDataSet = createScatterSet(report.levels[0]);
    const barDataSet = createBarSet(report.levels[0]);

    const chart = new Chart(context, {
        data: {
            labels: report.levels[0].fragments.map((f, i) => `Frag ${i}`),
            datasets: [
                ...lineDataSet,
                ...scatterDataSet,
            ],
        },
        type: 'line',
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        // max: datasets[1].data[datasets[1].data.length - 1].y,
                    },
                }],
            },
        },
    });
})();
