import Graph from "./graph";

test('empty undirected graph deserialized correctly', () => {
    const g = new Graph(false);
    const gg = Graph.fromJsonString(g.toJsonString());
    expect(gg).toEqual(g);
});

test('undirected K_5 deserialized correctly', () => {
    const g = new Graph(false, {
        1: [2,3,4,5],
        2: [1,3,4,5],
        3: [1,2,4,5],
        4: [1,2,3,5],
        5: [1,2,3,4]
    });
    const gg = Graph.fromJsonString(g.toJsonString());
    expect(gg).toEqual(g);
});

test('directed 4-cycle deserialized correctly', () => {
    const g = new Graph(false, {
        1: [2],
        2: [3],
        3: [4],
        4: [1]
    });
    const gg = Graph.fromJsonString(g.toJsonString());
    expect(gg).toEqual(g);
});
