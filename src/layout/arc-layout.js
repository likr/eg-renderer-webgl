export const arc = (ux, uy, vx, vy, division = 50) => {
  const points = []
  const cx = (ux + vx) / 2
  const cy = (uy + vy) / 2
  const theta0 = Math.atan2(uy - cy, ux - cx)
  const theta1 = Math.atan2(vy - cy, vx - cx)
  const dTheta = Math.abs(theta1 - theta0) / division
  const r = Math.sqrt((vx - ux) * (vx - ux) + (vy - uy) * (vy - uy)) / 2
  for (let i = 0; i <= division; ++i) {
    points.push([r * Math.cos(dTheta * i + theta0) + cx, r * Math.sin(dTheta * i + theta0) + cy])
  }
  return points
}

export const arcLayout = (graph) => {
  const layout = {
    vertices: {},
    edges: {}
  }
  let offset = 0
  for (const u of graph.vertices()) {
    layout.vertices[u] = {
      x: offset,
      y: 0,
      width: 20,
      height: 20
    }
    offset += 100
    layout.edges[u] = {}
  }
  for (const [u, v] of graph.edges()) {
    layout.edges[u][v] = {
      type: 'arc',
      width: 1,
      points: arc(layout.vertices[u].x, layout.vertices[u].y, layout.vertices[v].x, layout.vertices[v].y)
    }
  }
  return layout
}
