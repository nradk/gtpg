import { UnweightedGraph, fromJsonString } from "./graph";

test('empty undirected graph deserialized correctly', () => {
    const g = new UnweightedGraph(false);
    const gg = fromJsonString(JSON.stringify(g));
    expect(gg).toEqual(g);
});
/*
test('undirected K_5 deserialized correctly', () => {
    const graphJSON = {
        adjacencies: {
            1: [2,3,4,5],
            2: [1,3,4,5],
            3: [1,2,4,5],
            4: [1,2,3,5],
            5: [1,2,3,4]
        },
    };
    const g = new UnweightedGraph(false, );
    const gg = fromJsonString(JSON.stringify(g));
    expect(gg).toEqual(g);
});

test('directed 4-cycle deserialized correctly', () => {
    const g = new UnweightedGraph(false, {
        1: [2],
        2: [3],
        3: [4],
        4: [1]
    });
    const gg = fromJsonString(JSON.stringify(g));
    expect(gg).toEqual(g);
});
*/
