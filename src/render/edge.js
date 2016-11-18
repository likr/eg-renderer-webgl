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

const orthogonalVector = ([vx, vy]) => {
  if (vy === 0) {
    return [0, 1]
  }
  const vx2 = vx * vx
  const vy2 = vy * vy
  const x = Math.sqrt(vy2 / (vx2 + vy2))
  const y = -x * vx / vy
  if (vx >= 0 && vy >= 0) {
    return [-x, -y]
  } else if (vx >= 0 && vy <= 0) {
    return [x, y]
  } else if (vx <= 0 && vy >= 0) {
    return [-x, -y]
  } else {
    return [x, y]
  }
}

const norm = (x, y) => {
  return Math.sqrt(x * x + y * y)
}

const lineGeometry = (points) => {
  const result = []
  const width = 3
  {
    const [p1x, p1y] = points[0]
    const [p2x, p2y] = points[1]
    const [ux, uy] = orthogonalVector([p2x - p1x, p2y - p1y])
    result.push([ux * width / 2 + p1x, uy * width / 2 + p1y])
    result.push([-ux * width / 2 + p1x, -uy * width / 2 + p1y])
  }
  for (let j = 1; j < points.length - 1; ++j) {
    const [p0x, p0y] = points[j - 1]
    const [p1x, p1y] = points[j]
    const [p2x, p2y] = points[j + 1]
    const p01x = p0x - p1x
    const p01y = p0y - p1y
    const p21x = p2x - p1x
    const p21y = p2y - p1y
    const s1 = norm(p01x, p01y)
    const s2 = norm(p21x, p21y)
    const sx = p01x / s1 + p21x / s2
    const sy = p01y / s1 + p21y / s2
    if (s1 === 0 || s2 === 0 || norm(sx, sy) === 0) {
      result.push(Array.from(result[result.length - 2]))
      result.push(Array.from(result[result.length - 2]))
    } else {
      const theta = Math.acos((p01x * p21x + p01y * p21y) / s1 / s2)
      const r = width / Math.sin(theta / 2) / norm(sx, sy) / 2
      const [q01x, q01y] = orthogonalVector([p01x, p01y])
      const t = (p01x * p2y - p01y * p2x) / (p01x * q01y - p01y * q01x)
      if (t > 0) {
        result.push([-r * sx + p1x, -r * sy + p1y])
        result.push([r * sx + p1x, r * sy + p1y])
      } else {
        result.push([r * sx + p1x, r * sy + p1y])
        result.push([-r * sx + p1x, -r * sy + p1y])
      }
    }
  }
  {
    const [p0x, p0y] = points[points.length - 2]
    const [p1x, p1y] = points[points.length - 1]
    const [ux, uy] = orthogonalVector([p1x - p0x, p1y - p0y])
    result.push([ux * width / 2 + p1x, uy * width / 2 + p1y])
    result.push([-ux * width / 2 + p1x, -uy * width / 2 + p1y])
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
