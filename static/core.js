/**
 * Copyright (c) 2011, Emmanuel Garcia
 * All rights reserved
 * 
 * You are able to modify or use any part of this software
 * provided that you add the above copyright notice.
 * 
 * THIS SOFTWARE IS PROVIDED "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
 */

function cubeGame(canvas, width, height) {
	
	if (!canvas) throw "Fatal error: canvas object is needed";
	
	if (!width) width = canvas.width;
	else canvas.width = width;
	
	if (!height) height = canvas.height;
	else canvas.height = height;
	
	var timer,
		disc,
		time,
		lives,
		score,
		angle,
		debug = false,
		gameOver = false,
		isPaused = false,
		freq = 30,
		angleLimit = Math.PI/4,
		maxStars = 10,
		maxZ = 10000,
		cubeDuration = 2000,
		cubeSize = 150,
		stars = [],
		cubes = [],
		cubeColors = [],
		
		throwEvent = function(event, args) {},
		
		animations = {
			easeOut : function(t, d) {
				return -((t=t/d-1)*t*t*t - 1);
			}
		},
		
		getContext = function() {
			return canvas.getContext('2d');
		},
		
		setAngle = function(a) {
			angle = Math.max(-angleLimit, Math.min(angleLimit, a));
		},
		
		drawShape = function(points, color, use2D) {
			var j, pointsLen = points.length, ctx = getContext(), isLine = pointsLen==2;
		
			if (!use2D)
				for (j=0; j<pointsLen; j++)
					points[j] = get2DCoord(points[j]);

			if (isLine) ctx.strokeStyle = color;
			else ctx.fillStyle = color;
			ctx.beginPath(); 
			ctx.moveTo(points[0].x, points[0].y);
			for (j=1; j<pointsLen; j++){
				ctx.lineTo(points[j].x, points[j].y);
			}
			
			if (isLine) ctx.stroke();
			else ctx.fill();
		},
		
		P3 = function (x, y, z) {
			return {x: x, y: y, z: z};
		},
		
		P2 = function (x, y) {
			return {x : x, y : y};
		},
		
		RGBA = function(r, g, b, a) {
			var rgba = {r:r, g:g, b:b};
			if (a) rgba.a = a;
			rgba.toString = function() { 
				var b = Math.round(this.r)+","+Math.round(this.g)+","+Math.round(this.b);
				return (this.a) ? "rgba("+b+","+this.a+")" : "rgb("+b+")"; 
			};
			rgba.brightness = function(p) {
				return RGBA(this.r * p, this.g * p, this.b * p, a);
			};
			return rgba;
		},
		
		insidePoint = function (a, b, c, condition) {
			var tan = (b.y - a.y)/(a.x - b.x), x = a.x * tan + a.y - c.x * tan, y = a.y/tan + a.x - c.y/tan ;
				switch (condition) {
					case 'top' : return x > c.y;
					case 'bottom' : return x < c.y;
					case 'left' : return y > c.x;
					case 'right' : return y < c.x;
				}
		},
		
		cubeFront = function(coord, size) {
			return [P3(coord.x, coord.y, coord.z), 
					P3(coord.x + size, coord.y, coord.z),
					P3(coord.x + size, coord.y + size, coord.z), 
					P3(coord.x, coord.y + size, coord.z)];
		},
		
		cube = function (coord, size, color) {
			var color = color.brightness(Math.max(1 - ((coord.z / 5000) * 0.5), 0.3)), 
			//Front coords
				f  = cubeFront(coord, size),
			//Back coords		 
				b = [P3(coord.x, coord.y, coord.z + size), 
					 P3(coord.x + size, coord.y, coord.z + size),
					 P3(coord.x + size, coord.y + size, coord.z + size),
					 P3(coord.x, coord.y + size, coord.z + size)];
		
			//Right side
			if (insidePoint(get2DCoord(f[1]), get2DCoord(f[2]), get2DCoord(b[2]), 'right'))
				drawShape([f[1], b[1], b[2], f[2]], color.brightness(0.5).toString());
			  
			//Left side
			if (insidePoint(get2DCoord(f[0]), get2DCoord(f[3]), get2DCoord(b[3]) , 'left'))
				drawShape([f[0], f[3], b[3], b[0]], color.brightness(0.5).toString());
			
			//Top side
			if (insidePoint(get2DCoord(f[3]), get2DCoord(f[2]), get2DCoord(b[2]), 'top'))
				drawShape([f[3], f[2], b[2], b[3]], color.brightness(0.8).toString());
			
			//Bottom side
			if (insidePoint(get2DCoord(f[0]), get2DCoord(f[1]), get2DCoord(b[1]), 'bottom'))
				drawShape([f[0], f[1], b[1], b[0]], color.brightness(0.1).toString());


			//Front side
			drawShape(f, color.toString());
		},
		
		star = function(x, y, size) {
	 		var s = size/2, j = 0;
	 		for(; j<4; j++)
	 			drawShape([P3(x - (j==3 ? s : j*s), y + (j-2)*s, 0), P3(x + (j==3 ? s : j*s), y + (2-j)*s, 0)], "white");
		},
		
		generateStars = function() {
			if (!stars.length) {
				var j=0, hl = height*0.5, hm = height*0.7, sz;
				stars = [];
				for (; j<maxStars; j++)
					stars.push([width*Math.random(), hl*Math.random() + hm, 10 * (Math.random() + 1)/2]);
			}
		},
		
		verticalGradient = function(from, to, colors) {
			var gradient = getContext().createLinearGradient(from.x, from.y, to.x, to.y), j;
			for (j=0; j < colors.length; j++)
				gradient.addColorStop(colors[j][0], colors[j][1]);
			return gradient;
		},
		
		animate = function (callback, duration, effect) {
			var fps = 30, cicles = Math.round(duration / fps), pos = 0,
			f = function() { 
				callback(effect(pos, cicles));
				if (++pos > cicles) clearInterval(interval);
			},
			interval = setInterval(f, fps);
			f();
			return interval;
		},
		
		transformCoord = function(coord) {
			return P3(coord.x, height-coord.y, coord.z);
		},
			
		get2DCoord = function(coord) {
			var  e = that.getEye(), p = transformCoord(coord), d;
			
			/*Make 3D projection*/
			d = P2(e.z * (p.x-e.x) / (e.z+p.z), e.z * (p.y-e.y) / (e.z+p.z));
			
			/*Apply rotation matrix*/
			x2D = d.x * Math.cos(angle) + d.y * Math.sin(angle) + e.x;
			y2D = d.x * -Math.sin(angle) + d.y * Math.cos(angle) + e.y;
			
			if (debug) console.log(x2D + ", " + y2D);
			
			return P2(x2D, y2D);
		},
		
		collision = function(a, b) {
			var i,  aL = a.length, bL = b.length, point, nextPoint, edge, axis, i, aProj, bProj,
			project = function(axis, points) {
				var j,  d = axis.x*points[0].x + axis.y*points[0].y, r = {min: d, max: d};
				
				for (j=0; j < points.length; j++) {
						d = axis.x*points[j].x + axis.y*points[j].y;
						if (d < r.min) r.min = d;
						else if (d > r.max) r.max = d;
				}
				return r;
			}, translate = function (a) {
				for (var j=0; j < a.length; j++) {
					if ("z" in a[j]) a[j] = get2DCoord(a[j]);
					a[j].y = height - a[j].y;
				}
			};
			
			translate(a);
			translate(b);
			
			for (i=0; i < aL+bL; i++) {
				if (i<aL) {
					point = a[i];
					nextPoint = a[i+1] || a[0];
				} else {
					point = b[i-aL];
					nextPoint = b[i-aL+1] || b[0];
				}
				edge = P2(nextPoint.x-point.x, nextPoint.y-point.y); // nextPoint-point 
			    axis = P2(-edge.y, edge.x); //perpendicular vector of edge
			    
			  	aProj = project(axis, a);
			  	bProj = project(axis, b);
			  	
			  	if (aProj.min < bProj.min && bProj.min-aProj.max > 0) 
			  		return false;
			  	else if(aProj.min >= bProj.min && aProj.min-bProj.max > 0)
			  		return false;
			}
			
			return true;
		},
		
		draw = function() {
			var ctx = getContext(), e = that.getEye(), c = that.getCenter(), cubesLen = cubes.length,
			d = 1000,
			sen = Math.sin(angle),
			br =  e.x * -Math.abs(sen) + (e.y+20) * Math.cos(angle),  
			bl =  2 * (e.y+20) - br;
			
			drawShape([P2(0, 0), P2(width, 0), P2(width, height), P2(0, height)], "#B5D5FF", true);
		
			drawShape([P2(0, height), P2(width, height),  P2(width, (sen<0) ? bl : br), P2(0, (sen<0) ? br : bl )],
				      verticalGradient(P2(e.x, e.y), P2(e.x + e.x * Math.tan(angle), height), [[0, "#999"],[1,"#EAEAEA"]]) , 
				   	  true);
				   	  
			for (j = 0; j<maxStars; j++) 
				star(stars[j][0], stars[j][1], stars[j][2]);
				
			for (j=cubesLen-1; j>=0; j--) {
		 		cube(cubes[j].pos, cubes[j].size, cubes[j].color);
			}
			
			if (!disc) {
				(disc = new Image()).onload = function() {
					ctx.drawImage(disc, (width - disc.width) / 2, height - disc.height - 10);
				}
				disc.src = "static/disc.png";
			} else {
				var x = (width - disc.width) / 2,  y = height - disc.height - 10 + ((time % (d*2) < d ? time % d : d - time % d) / d) * 10;
				disc.pos = [P2(x + disc.width/2 , y), P2(x + disc.width, y + disc.height), P2(x + disc.width/2, y + disc.height/2), P2(x, y + disc.height)];
				ctx.drawImage(disc, x, y);
			}
		},
		
		endGame = function(){
			gameOver = true;
			if (timer) clearInterval(timer);
			throwEvent.apply(that, ['gameOver']);
		},
		
		that = {
			getCenter : function() {
				return P2(width/2, height/2);
			},
			
			setCanvasSize : function(w, h) {
				width = w;
				height = h;
			},
			
			getEye : function () {
				var c = this.getCenter();
				return P3(c.x, c.y , 1000);
			},
			
			setUpdateFrequency : function(value) {
				freq = value;
			},
			
			getUpdateFrequency : function() {
				return freq;
			},
			
			update : function() {
				var c, minZ = 200, cubesLen = cubes.length, j = 0;
				if (!cubesLen || maxZ - cubes[cubesLen-1].pos.z >= minZ) {
					cubes.push({pos: P3(Math.random()*width*4 - width, 0, maxZ), size: cubeSize, time: time, color: cubeColors[Math.round((cubeColors.length-1)*Math.random())] });
					cubesLen++;
				}
				
				for (; j<cubesLen; j++) {
					c = cubes[j];
					c.pos.z = maxZ - ((time-c.time) / cubeDuration) * maxZ;
			
					if (c.pos.z < 0  && !c.deleted  && collision(cubeFront(c.pos, c.size), disc.pos)
						) {
							c.color = RGBA(255, 0, 0);
							c.deleted = true;
							lives--;
						}
						
					if (c.pos.z < -cubeSize) {	
						cubes.splice(j, 1); 
						j--;
						cubesLen--;
						score++;
					}
				}
				
				throwEvent.apply(this, ['progress']);
				
				if (lives<0) endGame();
				
				draw();
			},

			start : function() {
				gameOver = false;
				isPaused = false;
				time = score = angle = 0;
				lives = 3;
				cubes = [];
				cubeColors	= [RGBA(50, 200, 200)];
				generateStars();
				throwEvent.apply(this, ['play']);
				if (timer) clearInterval(timer);
				timer = setInterval(function() { time+=freq; that.update(); }, freq);
				that.update();
			},
			
			play : function() {
				if (!gameOver) {
					isPaused = false;
					throwEvent.apply(this, ['play']);
					if (timer) clearInterval(timer);
					timer = setInterval(function() { time+=freq; that.update(); }, freq);
				}
			},

			pause : function () {
				if (!gameOver) {
					isPaused= true;
					if (timer) clearInterval(timer);
					throwEvent.apply(this, ['paused']);
				}
			},
			
			isPaused : function() {
				return isPaused;
			},
			
			isGameOver : function() {
				return gameOver;
			},
			
			getLives : function() {
				return lives;
			},
			
			getScore : function () {
				return score;
			},
			
			getTime : function () {
				return time;
			},

			addEventListener : function() {
				var clearElev,  mv = [0, 0],
				keyDown = function(e) {
					var key = (e || window.event).keyCode, left = 37, right = 39, enter = 13, space = 32;
					
					switch(key) {
						case left :
							if (clearElev) clearInterval(clearElev);
							mv[1]=0;
							setAngle(angle + (angleLimit * Math.min(1, mv[0] += 0.05 )));
						break;
						case right :
							if (clearElev) clearInterval(clearElev);
							mv[0]=0;
							setAngle(angle - (angleLimit * Math.min(1, mv[1] += 0.05 )));
						break;
						case enter:
							if (that.isPaused())
								that.play();
						break;
						case space:
							if (that.isPaused())
								that.play();
							else 
								that.pause();
						break;
					}
				 },
				 
				 keyUp = function() {
					if (clearElev) clearInterval(clearElev);
					clearElev = setTimeout(function() {
						mv = [0, 0]; 
						clearElev = animate(function(v){  setAngle(angle * (1-v)); }, 3000, animations.easeOut);
					}, 100);
				},
				
				blur = function(){
					game.pause(); 
				};

				addEvent(window, "keydown", keyDown);
				addEvent(window, "keyup", keyUp);
				addEvent(window, "blur", blur);
			},
			
			catchEvents : function(callback) {
				throwEvent = callback;
			}
	};
	return that;
}

function $(id) {
	return document.getElementById(id);
}

function addEvent(obj, event, callback, eventCapturing) {
	if ("addEventListener" in obj) 
		obj.addEventListener(event, callback, eventCapturing || false);
	else 
		obj.attachEvent("on" + event, callback);
}
