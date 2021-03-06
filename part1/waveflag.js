(function() {
    "use strict";
    /*global window,document,Float32Array,Uint16Array,mat4,vec3,snoise*/
    /*global getShaderSource,createWebGLContext,createProgram*/

    var NUM_WIDTH_PTS = 32;
    var NUM_HEIGHT_PTS = 32;
    
    var curTime = 0;

    var message = document.getElementById("message");
    var canvas = document.getElementById("canvas");
    var context = createWebGLContext(canvas, message);
    if (!context) {
        return;
    }

    ///////////////////////////////////////////////////////////////////////////

    context.viewport(0, 0, canvas.width, canvas.height);
    context.clearColor(0.0, 0.0, 0.0, 1.0);
    context.enable(context.DEPTH_TEST);
//    context.enable(context.CULL_FACE)

    var persp = mat4.create();
    mat4.perspective(45.0, 0.5, 0.1, 100.0, persp);

    var eye = [2.0, 1.0, 3.0];
    var center = [0.0, 0.0, 0.0];
    var up = [0.0, 0.0, 1.0];
    var view = mat4.create();
    mat4.lookAt(eye, center, up, view);

    var positionLocation = 0;
    var heightLocation = 1;
    var	Texcoord = 2;
    var u_modelViewPerspectiveLocation;
    var u_timeLocation;
    var u_FlagSamplerLocation;

    (function initializeShader() {
        var program;
        var vs = getShaderSource(document.getElementById("vs"));
        var fs = getShaderSource(document.getElementById("fs"));

		var program = createProgram(context, vs, fs, message);
		context.bindAttribLocation(program, positionLocation, "position");
		context.bindAttribLocation(program, Texcoord, "Texcoord");
		u_modelViewPerspectiveLocation = context.getUniformLocation(program,"u_modelViewPerspective");
		u_timeLocation = context.getUniformLocation (program, "u_time");
		u_FlagSamplerLocation = context.getUniformLocation (program, "u_FlagSampler");

        context.useProgram(program);
    })();
    
    var flagTex   = context.createTexture();

    function initLoadedTexture(texture){
        context.bindTexture(context.TEXTURE_2D, texture);
        context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, true);
        context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, context.RGBA, context.UNSIGNED_BYTE, texture.image);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.REPEAT);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.REPEAT);
        context.bindTexture(context.TEXTURE_2D, null);
    }

    var heights;
    var numberOfIndices;

    (function initializeGrid() {
        function uploadMesh(positions, heights, indices, texCoords) {
            // Positions
            var positionsName = context.createBuffer();
            context.bindBuffer(context.ARRAY_BUFFER, positionsName);
            context.bufferData(context.ARRAY_BUFFER, positions, context.STATIC_DRAW);
            context.vertexAttribPointer(positionLocation, 2, context.FLOAT, false, 0, 0);
            context.enableVertexAttribArray(positionLocation);

            if (heights)
            {
                // Heights
                var heightsName = context.createBuffer();
                context.bindBuffer(context.ARRAY_BUFFER, heightsName);
                context.bufferData(context.ARRAY_BUFFER, heights.length * heights.BYTES_PER_ELEMENT, context.STREAM_DRAW);
                context.vertexAttribPointer(heightLocation, 1, context.FLOAT, false, 0, 0);
                context.enableVertexAttribArray(heightLocation);
            }

            // Indices
            var indicesName = context.createBuffer();
            context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, indicesName);
            context.bufferData(context.ELEMENT_ARRAY_BUFFER, indices, context.STATIC_DRAW);
            
            // TextureCoords
            var texCoordsName = context.createBuffer();
            context.bindBuffer(context.ARRAY_BUFFER, texCoordsName);
            context.bufferData(context.ARRAY_BUFFER, texCoords, context.STATIC_DRAW);
            context.vertexAttribPointer(Texcoord, 2, context.FLOAT, false, 0, 0);
            context.enableVertexAttribArray(Texcoord);

        }

        var WIDTH_DIVISIONS = NUM_WIDTH_PTS - 1;
        var HEIGHT_DIVISIONS = NUM_HEIGHT_PTS - 1;

        var numberOfPositions = NUM_WIDTH_PTS * NUM_HEIGHT_PTS;

        var positions = new Float32Array(2 * numberOfPositions);
        var texCoords = new Float32Array(2 * numberOfPositions);
        var indices = new Uint16Array(2 * WIDTH_DIVISIONS * HEIGHT_DIVISIONS * 3);

        var positionsIndex = 0;
        var texCoordsIndex = 0;
        var indicesIndex = 0;
        var length;

        for (var j = 0; j < NUM_WIDTH_PTS; ++j)
        {
            positions[positionsIndex++] = j / WIDTH_DIVISIONS;
            positions[positionsIndex++] = 0.0;
            texCoords[texCoordsIndex++] = j / WIDTH_DIVISIONS;
            texCoords[texCoordsIndex++] = 0.0;
		
		    indices[indicesIndex++] = j + NUM_WIDTH_PTS;
            indices[indicesIndex++] = j;
		    indices[indicesIndex++] = j + 1;
		    indices[indicesIndex++] = j + 1;
		    indices[indicesIndex++] = j + 1 + NUM_WIDTH_PTS;
		    indices[indicesIndex++] = j + NUM_WIDTH_PTS;
        }

        for (var i = 0; i < HEIGHT_DIVISIONS; ++i)
        {
             var v = (i + 1) / (HEIGHT_DIVISIONS);
                          
             positions[positionsIndex++] = 0.0;
             positions[positionsIndex++] = v;
             texCoords[texCoordsIndex++] = 0.0;
             texCoords[texCoordsIndex++] = v;

             for (var k = 0; k < WIDTH_DIVISIONS; ++k)
             {
             	 j += k + 1;
                 positions[positionsIndex++] = (k + 1) / WIDTH_DIVISIONS;
                 positions[positionsIndex++] = v;
                 texCoords[texCoordsIndex++] = (k + 1) / WIDTH_DIVISIONS;
             	 texCoords[texCoordsIndex++] = v;
             }
             
        }
        
        for (var i = 1; i < HEIGHT_DIVISIONS; ++i)
         {
         	for (var k = 0; k < WIDTH_DIVISIONS; ++k)
         	{
	            var j = (i * NUM_WIDTH_PTS) + k;

         		indices[indicesIndex++] = j + NUM_WIDTH_PTS;
             	indices[indicesIndex++] = j;
		    	indices[indicesIndex++] = j + 1;
		    	indices[indicesIndex++] = j + 1;
		    	indices[indicesIndex++] = j + 1 + NUM_WIDTH_PTS;
		    	indices[indicesIndex++] = j + NUM_WIDTH_PTS;
		    }
		 }

        uploadMesh(positions, heights, indices, texCoords);
        numberOfIndices = indices.length;
    })();

    (function animate(){
        ///////////////////////////////////////////////////////////////////////////
        // Update

        var model = mat4.create();
        mat4.identity(model);
        mat4.translate(model, [-0.5, -0.5, 0.0]);
        var mv = mat4.create();
        mat4.multiply(view, model, mv);
        var mvp = mat4.create();
        mat4.multiply(persp, mv, mvp);
        curTime += 0.01;

        ///////////////////////////////////////////////////////////////////////////
        // Render
        context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);

        context.uniformMatrix4fv(u_modelViewPerspectiveLocation, false, mvp);
        context.uniform1f (u_timeLocation, curTime);
        context.activeTexture(context.TEXTURE0);
        context.bindTexture(context.TEXTURE_2D, flagTex);
        context.uniform1i(u_FlagSamplerLocation, 0);

        context.drawElements(context.TRIANGLES, numberOfIndices, context.UNSIGNED_SHORT,0);

		window.requestAnimFrame(animate);
    })();
    
    var textureCount = 0;
        
    function initializeTexture(texture, src) {
        texture.image = new Image();
        texture.image.onload = function() {
            initLoadedTexture(texture);

            // Animate once textures load.
            if (++textureCount === 1) {
                /*animate()*/;
            }
        }
        texture.image.src = src;
    }

    initializeTexture(flagTex, "flag1024.png");
}());
