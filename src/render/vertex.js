import {initShader, initProgram} from './program'

const vertexShaderProgram = (gl) => {
  const vertexShader = initShader(gl, gl.VERTEX_SHADER, `#version 300 es
      layout(location = 0) in vec3 aPosition0;
      layout(location = 1) in vec3 aPosition1;
      layout(location = 2) in vec4 aColor;
      layout(location = 3) in float aSize;
      uniform mat4 uMVMatrix;
      uniform mat4 uPMatrix;
      uniform float r;
      out vec4 vColor;
      void main() {
        vec4 mvPosition = uMVMatrix * vec4(r * aPosition1 + (1.0 - r) * aPosition0, 1.0);
        gl_PointSize = aSize * uMVMatrix[0][0];
        gl_Position = uPMatrix * mvPosition;
        vColor = aColor;
      }
    `)
  const fragmentShader = initShader(gl, gl.FRAGMENT_SHADER, `#version 300 es
      precision mediump float;
      in vec4 vColor;
      out vec4 oFragColor;
      void main() {
        vec3 n;
        n.xy = gl_PointCoord * 2.0 - 1.0;
        n.z = 1.0 - dot( n.xy, n.xy );
        if (n.z < 0.0) {
          discard;
        }
        oFragColor = vColor;
      }
    `)
  return initProgram(gl, vertexShader, fragmentShader)
}

export const setVertexData = (gl, obj, vertices, vertices0) => {
  const data = new Float32Array(vertices.length * 11)
  for (let i = 0; i < vertices.length; ++i) {
    const vertex = vertices[i]
    const vertex0 = vertices0[i]
    data[i * 11] = vertex0.x
    data[i * 11 + 1] = vertex0.y
    data[i * 11 + 2] = 0
    data[i * 11 + 3] = vertex.x
    data[i * 11 + 4] = vertex.y
    data[i * 11 + 5] = 0
    data[i * 11 + 6] = Math.random()
    data[i * 11 + 7] = Math.random()
    data[i * 11 + 8] = Math.random()
    data[i * 11 + 9] = 1
    data[i * 11 + 10] = 10 * Math.random() + 5
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer.buffer)
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
  obj.vertexBuffer.data = data

  const elements = new Uint16Array(vertices.length)
  vertices.forEach((vertex, i) => {
    elements[i] = i
  })
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.elementBuffer.buffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elements, gl.STATIC_DRAW)
  obj.elementBuffer.data = elements
}

export const vertexObject = (gl) => {
  const vertexBuffer = gl.createBuffer()
  const elementBuffer = gl.createBuffer()
  const program = vertexShaderProgram(gl)
  const position0Location = gl.getAttribLocation(program, 'aPosition0')
  const position1Location = gl.getAttribLocation(program, 'aPosition1')
  const colorLocation = gl.getAttribLocation(program, 'aColor')
  const sizeLocation = gl.getAttribLocation(program, 'aSize')
  const vertexArray = gl.createVertexArray()
  gl.bindVertexArray(vertexArray)
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer)
  gl.enableVertexAttribArray(position0Location)
  gl.enableVertexAttribArray(position1Location)
  gl.enableVertexAttribArray(colorLocation)
  gl.enableVertexAttribArray(sizeLocation)
  gl.vertexAttribPointer(position0Location, 3, gl.FLOAT, false, 44, 0)
  gl.vertexAttribPointer(position1Location, 3, gl.FLOAT, false, 44, 12)
  gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 44, 24)
  gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, 44, 40)
  gl.bindVertexArray(null)
  return {
    mode: gl.POINTS,
    program,
    vertexBuffer: {
      buffer: vertexBuffer,
      data: new Float32Array()
    },
    elementBuffer: {
      buffer: elementBuffer,
      data: new Uint16Array()
    },
    geometry: vertexArray
  }
}
