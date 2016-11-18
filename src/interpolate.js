import {arc} from './layout/arc-layout'

const diffLineEdge = (current, next, du, dv) => {
  if (current) {
    return current
  } else if (du && dv) {
    return Object.assign({}, next, {
      points: [[du.x, du.y], [dv.x, dv.y]]
    })
  } else if (du) {
    const {x, y} = du
    const {points} = next
    return Object.assign({}, next, {
      points: [[x, y], [points[1][0], 0]]
    })
  } else if (dv) {
    const {x, y} = dv
    const {points} = next
    return Object.assign({}, next, {
      points: [[points[1][0], 0], [x, y]]
    })
  } else {
    return Object.assign({}, next, {
      points: next.points.map(([x]) => [x, 0])
    })
  }
}

const diffArcEdge = (current, next, du, dv) => {
  if (current) {
    return current
  } else if (du && dv) {
    return Object.assign({}, next, {
      points: arc(du.x, du.y, dv.x, dv.y)
    })
  } else if (du) {
    return Object.assign({}, next, {
      points: arc(du.x, du.y, next.points[1][0], 0)
    })
  } else if (dv) {
    return Object.assign({}, next, {
      points: arc(next.points[0][0], 0, dv.x, dv.y)
    })
  } else {
    return Object.assign({}, next, {
      points: arc(next.points[0][0], 0, next.points[1][0], 0)
    })
  }
}

const diffHierarchyEdge = (current, next, du, dv) => {
  if (current) {
    return current
  } else if (du && dv) {
    return Object.assign({}, next, {
      points: [
        [du.x + du.width / 2, du.y],
        [du.x + du.width / 2, du.y],
        [du.x + du.width / 2, du.y],
        [du.x + du.width / 2, du.y],
        [dv.x - dv.width / 2, dv.y],
        [dv.x - dv.width / 2, dv.y]
      ]
    })
  } else if (du) {
    const {x, y, width} = du
    const {points} = next
    return Object.assign({}, next, {
      points: [
        [x + width / 2, y],
        [x + width / 2, y],
        [points[2][0], 0],
        [points[3][0], 0],
        [points[4][0], 0],
        [points[5][0], 0]
      ]
    })
  } else if (dv) {
    const {x, y, width} = dv
    const {points} = next
    return Object.assign({}, next, {
      points: [
        [points[0][0], 0],
        [points[1][0], 0],
        [points[2][0], 0],
        [points[3][0], 0],
        [x - width / 2, y],
        [x - width / 2, y]
      ]
    })
  } else {
    return Object.assign({}, next, {
      points: next.points.map(([x]) => [x, 0])
    })
  }
}

export const diff = (current, next) => {
  const vertices = Object.keys(next.vertices)
  const result = {
    vertices: {},
    edges: {}
  }
  for (const u of vertices) {
    if (current.vertices[u]) {
      result.vertices[u] = current.vertices[u]
    } else {
      result.vertices[u] = Object.assign({}, next.vertices[u], {
        y: 0
      })
    }
    result.edges[u] = {}
    for (const v of vertices) {
      const nextEdge = next.edges[u][v]
      if (nextEdge) {
        const currentEdge = (current.edges[u] && current.edges[u][v] && current.edges[u][v].type === nextEdge.type) ? current.edges[u][v] : null
        const du = current.vertices[u] || null
        const dv = current.vertices[v] || null
        if (nextEdge.type === 'arc') {
          result.edges[u][v] = diffArcEdge(currentEdge, nextEdge, du, dv)
        } else if (nextEdge.type === 'line') {
          result.edges[u][v] = diffLineEdge(currentEdge, nextEdge, du, dv)
        } else if (nextEdge.type === 'hierarchy') {
          result.edges[u][v] = diffHierarchyEdge(currentEdge, nextEdge, du, dv)
        }
      }
    }
  }
  return result
}
