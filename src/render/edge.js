import {initShader, initProgram} from './program'

const edgeShaderProgram = (gl) => {
  const vertexShader = initShader(gl, gl.VERTEX_SHADER, `#version 300 es
      layout(location = 0) in vec3 aPosition0;
      layout(location = 1) in vec3 aPosition1;
      layout(location = 2) in vec4 aColor;
      uniform mat4 uMVMatrix;
      uniform mat4 uPMatrix;
      uniform float r;
      out vec4 vColor;
      void main() {
        vColor = aColor;
        gl_Position = uPMatrix * uMVMatrix * vec4(r * aPosition1 + (1.0 - r) * aPosition0, 1.0);
      }
    `)
  const fragmentShader = initShader(gl, gl.FRAGMENT_SHADER, `#version 300 es
      precision mediump float;
      in vec4 vColor;
      out vec4 oFragColor;
      void main() {
        oFragColor = vColor;
      }
    `)
  return initProgram(gl, vertexShader, fragmentShader)
}

const lineGeometry = (points) => {
  const result = []
  const width = 3
  {
    const [p1x, p1y] = points[0]
    const [p2x, p2y] = points[1]
    const theta1 = Math.atan2(p2y - p1y, p2x - p1x)
    result.push([
      width / Math.sqrt(2) * Math.cos(theta1 + 3 * Math.PI / 4) + p1x,
      width / Math.sqrt(2) * Math.sin(theta1 + 3 * Math.PI / 4) + p1y
    ])
    result.push([
      width / Math.sqrt(2) * Math.cos(theta1 - 3 * Math.PI / 4) + p1x,
      width / Math.sqrt(2) * Math.sin(theta1 - 3 * Math.PI / 4) + p1y
    ])
  }
  for (let j = 1; j < points.length - 1; ++j) {
    const [p1x, p1y] = points[j - 1]
    const [p2x, p2y] = points[j]
    const [p3x, p3y] = points[j + 1]
    const theta1 = Math.atan2(p2y - p1y, p2x - p1x)
    const theta2 = Math.atan2(p3y - p2y, p3x - p2x)
    result.push([
      width / Math.cos((theta1 - theta2) / 2) / 2 * Math.cos((theta1 + theta2 + Math.PI) / 2) + p2x,
      width / Math.cos((theta1 - theta2) / 2) / 2 * Math.sin((theta1 + theta2 + Math.PI) / 2) + p2y
    ])
    result.push([
      width / Math.cos((theta1 - theta2) / 2) / 2 * Math.cos((theta1 + theta2 - Math.PI) / 2) + p2x,
      width / Math.cos((theta1 - theta2) / 2) / 2 * Math.sin((theta1 + theta2 - Math.PI) / 2) + p2y
    ])
  }
  {
    const [p2x, p2y] = points[points.length - 2]
    const [p3x, p3y] = points[points.length - 1]
    const theta2 = Math.atan2(p3y - p2y, p3x - p2x)
    result.push([
      width / Math.sqrt(2) * Math.cos(theta2 + Math.PI / 4) + p3x,
      width / Math.sqrt(2) * Math.sin(theta2 + Math.PI / 4) + p3y
    ])
    result.push([
      width / Math.sqrt(2) * Math.cos(theta2 - Math.PI / 4) + p3x,
      width / Math.sqrt(2) * Math.sin(theta2 - Math.PI / 4) + p3y
    ])
  }
  return result
}

export const setEdgeData = (gl, obj, edges, edges0) => {
  let vertexCount = 0
  let elementCount = 0
  for (const edge of edges) {
    vertexCount += edge.points.length * 2
    elementCount += (edge.points.length - 1) * 2
  }

  const data = new Float32Array(vertexCount * 10)
  const elements = new Uint16Array(elementCount * 3)

  for (let i = 0, dataOffset = 0, elementOffset = 0; i < edges.length; ++i) {
    const edge = edges[i]
    const edge0 = edges0[i]
    const r = Math.random()
    const g = Math.random()
    const b = Math.random()
    const geometry = lineGeometry(edge.points)
    const geometry0 = lineGeometry(edge0.points)
    let dataOffsetStart = dataOffset
    for (let j = 0; j < geometry.length; ++j) {
      data[dataOffset * 10] = geometry0[j][0]
      data[dataOffset * 10 + 1] = geometry0[j][1]
      data[dataOffset * 10 + 2] = 0
      data[dataOffset * 10 + 3] = geometry[j][0]
      data[dataOffset * 10 + 4] = geometry[j][1]
      data[dataOffset * 10 + 5] = 0
      data[dataOffset * 10 + 6] = r
      data[dataOffset * 10 + 7] = g
      data[dataOffset * 10 + 8] = b
      data[dataOffset * 10 + 9] = 1
      dataOffset += 1
    }
    for (let j = 1; j < edge.points.length; ++j) {
      elements[elementOffset * 3] = dataOffsetStart
      elements[elementOffset * 3 + 1] = dataOffsetStart + 1
      elements[elementOffset * 3 + 2] = dataOffsetStart + 2
      elements[elementOffset * 3 + 3] = dataOffsetStart + 1
      elements[elementOffset * 3 + 4] = dataOffsetStart + 2
      elements[elementOffset * 3 + 5] = dataOffsetStart + 3
      elementOffset += 2
      dataOffsetStart += 2
    }
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer.buffer)
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
  obj.vertexBuffer.data = data

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.elementBuffer.buffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elements, gl.STATIC_DRAW)
  obj.elementBuffer.data = elements
}

export const edgeObject = (gl) => {
  const vertexBuffer = gl.createBuffer()
  const elementBuffer = gl.createBuffer()
  const program = edgeShaderProgram(gl)
  const position0Location = gl.getAttribLocation(program, 'aPosition0')
  const position1Location = gl.getAttribLocation(program, 'aPosition1')
  const colorLocation = gl.getAttribLocation(program, 'aColor')
  const edgeArray = gl.createVertexArray()
  gl.bindVertexArray(edgeArray)
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer)
  gl.enableVertexAttribArray(position0Location)
  gl.enableVertexAttribArray(position1Location)
  gl.enableVertexAttribArray(colorLocation)
  gl.vertexAttribPointer(position0Location, 3, gl.FLOAT, false, 40, 0)
  gl.vertexAttribPointer(position1Location, 3, gl.FLOAT, false, 40, 12)
  gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 40, 24)
  gl.bindVertexArray(null)
  return {
    mode: gl.TRIANGLES,
    program,
    vertexBuffer: {
      buffer: vertexBuffer,
      data: new Float32Array()
    },
    elementBuffer: {
      buffer: elementBuffer,
      data: new Uint16Array()
    },
    geometry: edgeArray
  }
}
