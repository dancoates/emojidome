import React from 'react';
import ReactDOM from 'react-dom';
import Gromit from 'gromit';
import {Chart, Line, ChartData, Axis, Benchmark} from 'pnut';


class Worm extends React.Component {
    constructor(props) {
        super(props);

        this.state = JSON.parse(localStorage.getItem('emojidome')) || {};
    }

    componentDidMount() {
        const ws = new WebSocket("wss://emojidome.xkcd.com/2131/socket");
        ws.addEventListener("message", (payload) => this.onMessage(payload));
    }

    onMessage(payload) {
        const data = JSON.parse(payload.data);
        if(data.event === 'start') {
            this.setState({
                currentEndTime: data.bracket.current.extra.end_time
            });
        }

        if(data.event === 'score') {
            const matchup = data.scores.sort((a,b) => a.competitor > b.competitor ? -1 : 1).map(ii => ii.competitor).join();
            const statePayload = {
                ...this.state,
                currentMatchup: matchup,
                results: {
                    ...(this.state.results || {}),
                    [matchup]: ((this.state.results || {})[matchup] || []).concat({
                        time: Date.now(),
                        scores: data.scores
                    })
                }
            };
            localStorage.setItem('emojidome', JSON.stringify(statePayload));
            this.setState(statePayload);
        }
    }


    render() {

        try {
            const rows = this.state.results[this.state.matchupToShow || this.state.currentMatchup];
            if(rows.length === 0) return null;
            const columns = [
                {key: 'ratio', isContinuous: true},
                {key: 'time', isContinuous: true}
            ];

            const first = rows[0].scores[0].competitor;
            const second = rows[0].scores[1].competitor;


            const latestFirst = rows[rows.length - 1].scores.find(ii => ii.competitor === first).score;
            const latestSecond = rows[rows.length - 1].scores.find(ii => ii.competitor === second).score;

            const formattedRows = rows.map(ii => {
                const firstScore = ii.scores.find(jj => jj.competitor === first).score;
                const secondScore = ii.scores.find(jj => jj.competitor === second).score;
                return {
                    ratio: (firstScore / (firstScore + secondScore)) * (latestFirst + latestSecond),
                    time: new Date(ii.time)
                };
            });

            const chartData = new ChartData(formattedRows, columns);
            const previousMatchups = Object.keys(this.state.results)
                .map(key => {
                    return <li key={key} onClick={() => this.setState({matchupToShow: key})}>{key}</li>
                });

            const xMax = this.state.matchupToShow === this.state.currentMatchup
                ? new Date(this.state.currentEndTime)
                : chartData.max('time');

            return <div>
                <Chart
                    data={chartData}
                    xColumn={'time'}
                    yColumn={'ratio'}
                    yScaleUpdate={(scale) => scale.domain([0, latestFirst + latestSecond])}
                    xScaleUpdate={(scale) => scale.domain([chartData.min('time'), xMax])}
                    width={1280}
                    padding={[80,80,80,80]}
                    height={720}
                >
                    <text x={500} fontSize={50}>{first}</text>
                    <text x={600} fontSize={50}>{latestFirst}</text>
                    <text x={500} y={600} fontSize={50}>{second}</text>
                    <text x={600} y={600} fontSize={50}>{latestSecond}</text>
                    <Axis dimension={'y'}/>
                    <Benchmark location={(latestFirst + latestSecond) / 2}/>
                    <Benchmark location={xMax} dimension={'x'}/>
                    <Line/>
                </Chart>
                <div>Previous matchups</div>
                <ul>
                    {previousMatchups}
                </ul>

            </div>;

        } catch(err) {
            console.error(err);
            return null;
        }
    }
}


ReactDOM.render(<Worm/>, app);