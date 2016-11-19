import 'babel-polyfill'
import * as d3 from 'd3'
import Graph from 'egraph/graph'
import Layouter from 'egraph/layouter/sugiyama'
import {arcLayout} from './layout/arc-layout'
import {circularLayout} from './layout/circular-layout'
import {
  centerTransform,
  layoutRect
} from './centering'
import {
  diff
} from './interpolate'
import {setVertexData, vertexObject} from './render/vertex'
import {setEdgeData, edgeObject} from './render/edge'
import {
  identity,
  translate,
  scale,
  matmul,
  viewingMatrix,
  orthogonalMatrix
} from './render/matrix'

const init = (gl, canvas) => {
  gl.clearColor(1.0, 1.0, 1.0, 1.0)
  return {
    mvMatrix: identity(),
    pMatrix: identity(),
    objects: {
      edges: edgeObject(gl),
      vertices: vertexObject(gl)
    }
  }
}

const draw = (gl, context, r) => {
  const {mvMatrix, pMatrix} = context
  gl.clear(gl.COLOR_BUFFER_BIT)

  for (const name in context.objects) {
    const obj = context.objects[name]
    gl.useProgram(obj.program)
    const mvLocation = gl.getUniformLocation(obj.program, 'uMVMatrix')
    gl.uniformMatrix4fv(mvLocation, false, mvMatrix)
    const pLocation = gl.getUniformLocation(obj.program, 'uPMatrix')
    gl.uniformMatrix4fv(pLocation, false, pMatrix)
    const rLocation = gl.getUniformLocation(obj.program, 'r')
    gl.uniform1f(rLocation, r)
    gl.bindVertexArray(obj.geometry)
    gl.drawElements(obj.mode, obj.elementBuffer.data.length, gl.UNSIGNED_SHORT, 0)
    gl.bindVertexArray(null)
  }
}

const privates = new WeakMap()

const accessor = (self, key, args) => {
  if (args.length === 0) {
    return privates.get(self)[key]
  }
  privates.get(self)[key] = args[0]
  return self
}

class EgRenderer extends window.HTMLElement {
  createdCallback () {
    const canvas = document.createElement('canvas')
    this.createShadowRoot().appendChild(canvas)
    const gl = canvas.getContext('webgl2')
    const context = init(gl, canvas)

    const p = {
      canvas,
      gl,
      context,
      layoutResult: {
        vertices: {},
        edges: {}
      },
      highlightedVertex: null,
      graph: new Graph(),
      margin: 10,
      transitionDuration: 500,
      zoom: d3.zoom().on('zoom', () => {
        const {x, y, k} = d3.event.transform
        const mMatrix = matmul(scale(k, k), translate(x, y))
        context.mvMatrix = matmul(viewingMatrix([0, 0, 1], [0, 1, 0], [0, 0, 0]), mMatrix)
      }),
      layoutTime: 0,
      layouter: new Layouter(),
      edgeType: 'curve',
      vertexType: 'rect',
      vertexText: ({d}) => d.text
    }
    privates.set(this, p)

    d3.select(canvas)
      .call(p.zoom)

    const render = () => {
      const now = new Date()
      const r = Math.min(1, (now - p.layoutTime) / p.transitionDuration)
      draw(gl, context, r)
      window.requestAnimationFrame(render)
    }
    render()
  }

  layout (mode = 'hierarchy') {
    const p = privates.get(this)
    const {graph, layouter, gl, context} = p
    let layoutResult
    switch (mode) {
      case 'arc':
        layoutResult = arcLayout(graph)
        break
      case 'circular':
        layoutResult = circularLayout(graph)
        break
      case 'hierarchy':
        layoutResult = layouter.layout(graph)
        for (const [u, v] of graph.edges()) {
          const {points} = layoutResult.edges[u][v]
          while (points.length < 6) {
            points.push(points[points.length - 1])
          }
          if (points[0][0] === points[1][0] && points[0][1] === points[1][1]) {
            points[0][0] -= 10
          }
          if (points[4][0] === points[5][0] && points[4][1] === points[5][1]) {
            points[5][0] += 10
          }
          layoutResult.edges[u][v].type = 'hierarchy'
        }
        break
    }
    const layoutResult0 = diff(p.layoutResult, layoutResult)
    const vertices = graph.vertices().map((u) => layoutResult.vertices[u])
    const vertices0 = graph.vertices().map((u) => layoutResult0.vertices[u])
    const edges = graph.edges().map(([u, v]) => layoutResult.edges[u][v])
    const edges0 = graph.edges().map(([u, v]) => layoutResult0.edges[u][v])
    setVertexData(gl, context.objects.vertices, vertices, vertices0)
    setEdgeData(gl, context.objects.edges, edges, edges0)

    p.layoutResult = layoutResult
    p.layoutTime = new Date()
    return this
  }

  resize (width, height) {
    const {canvas, context, gl} = privates.get(this)
    canvas.width = width
    canvas.height = height

    gl.viewport(0, 0, width, height)
    const left = 0
    const right = width - 1
    const top = 0
    const bottom = height - 1
    const near = -10
    const far = 10
    context.pMatrix = orthogonalMatrix(left, right, top, bottom, near, far)

    return this
  }

  center () {
    const {canvas, layoutResult, margin, zoom} = privates.get(this)
    const {layoutWidth, layoutHeight} = layoutRect(layoutResult)
    const {x, y, k} = centerTransform(layoutWidth, layoutHeight, canvas.width, canvas.height, margin)
    zoom.transform(d3.select(canvas), d3.zoomIdentity.translate(x, y).scale(k))
  }

  graph () {
    return privates.get(this).graph
  }

  layouter () {
    return privates.get(this).layouter
  }

  transitionDuration () {
    return accessor(this, 'transitionDuration', arguments)
  }

  vertexType () {
    return accessor(this, 'vertexType', arguments)
  }

  edgeType () {
    return accessor(this, 'edgeType', arguments)
  }

  vertexText () {
    return accessor(this, 'vertexText', arguments)
  }
}

document.registerElement('eg-renderer', EgRenderer)
