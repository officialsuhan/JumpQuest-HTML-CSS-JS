(() => {
  "use strict";
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const $ = id => document.getElementById(id);
  const ui = {
    levelName:$("levelName"), worldLabel:$("worldLabel"), objectiveLabel:$("objectiveLabel"),
    score:$("scoreValue"), coins:$("coinValue"), hearts:$("heartValue"), level:$("levelValue"),
    time:$("timeValue"), progress:$("progressValue"), progressBar:$("progressBar"),
    checkpoint:$("checkpointLabel"), missionTitle:$("missionTitle"), missionText:$("missionText"),
    startOverlay:$("startOverlay"), pauseOverlay:$("pauseOverlay"), messageOverlay:$("messageOverlay"),
    messageIcon:$("messageIcon"), messageEyebrow:$("messageEyebrow"), messageTitle:$("messageTitle"),
    messageText:$("messageText"), messageBtn:$("messageBtn"), pauseBtn:$("pauseBtn"),
    pauseLabel:$("pauseLabel"), soundBtn:$("soundBtn"), soundLabel:$("soundLabel")
  };

  const W = canvas.width, H = canvas.height, TILE = 48, GRAVITY = 1900;
  const levels = [
    {name:"Green Hills", mission:"The First Steps", sky:["#79d8d3","#d5f4ca"], ground:"#376c59", accent:"#b8f36a", length:2500,
      platforms:[[0,470,620,70],[700,430,220,110],[1000,390,220,150],[1290,450,260,90],[1630,405,210,135],[1910,455,300,85],[2260,410,320,130]],
      coins:[[220,420],[300,365],[430,410],[760,380],[830,365],[1060,340],[1150,315],[1380,400],[1450,395],[1710,355],[1810,355],[1990,405],[2080,400],[2350,360],[2460,360]],
      enemies:[[520,432,470,620],[1080,352,1000,1210],[1790,367,1640,1830],[2070,417,1920,2180]],
      hazards:[[620,458,55,12],[940,418,48,12],[1550,438,65,12],[2180,443,60,12]], checkpoint:[1630,355], portal:[2480,334]},
    {name:"Crystal Caverns", mission:"Shiny & Dangerous", sky:["#6f9edb","#c7e9ff"], ground:"#42577d", accent:"#9ff3ff", length:2860,
      platforms:[[0,470,450,70],[520,425,220,115],[820,375,190,165],[1090,440,230,100],[1410,385,220,155],[1700,435,230,105],[2010,365,220,175],[2310,420,200,120],[2570,450,300,90]],
      coins:[[170,420],[270,390],[600,375],[680,370],[880,330],[960,320],[1150,395],[1250,395],[1480,340],[1570,340],[1780,390],[1880,390],[2080,320],[2170,315],[2370,375],[2670,405],[2780,405]],
      enemies:[[360,432,200,430],[630,387,530,720],[1180,402,1100,1300],[1510,347,1420,1610],[1800,397,1710,1900],[2400,382,2330,2490],[2690,412,2610,2820]],
      hazards:[[450,458,70,12],[740,413,65,12],[1010,363,65,12],[1320,428,80,12],[1630,373,65,12],[1930,408,80,12],[2510,438,60,12]], checkpoint:[2010,320], portal:[2780,374]},
    {name:"Sky Temple", mission:"The Final Ascent", sky:["#f0b5a7","#f9e2b7"], ground:"#73536f", accent:"#ffe17b", length:3100,
      platforms:[[0,470,390,70],[460,420,180,120],[700,360,180,180],[940,410,200,130],[1200,340,180,200],[1440,395,200,145],[1700,330,190,210],[1950,390,190,150],[2200,325,180,215],[2430,385,190,155],[2670,430,200,110],[2930,390,250,150]],
      coins:[[130,420],[245,410],[500,370],[570,365],[740,315],[820,300],[990,365],[1070,360],[1240,295],[1320,285],[1490,350],[1580,345],[1740,285],[1830,280],[2000,345],[2100,340],[2240,280],[2320,275],[2480,340],[2570,340],[2730,385],[2810,380],[2980,345],[3070,345]],
      enemies:[[310,432,180,370],[550,377,480,610],[780,317,720,850],[1020,367,960,1110],[1280,297,1220,1360],[1530,352,1470,1620],[1780,287,1720,1860],[2040,347,1980,2120],[2290,282,2230,2370],[2520,342,2460,2600],[2760,387,2700,2840]],
      hazards:[[390,458,70,12],[640,408,60,12],[880,348,60,12],[1140,398,60,12],[1380,328,60,12],[1640,383,60,12],[1890,318,60,12],[2140,378,60,12],[2380,313,50,12],[2620,418,50,12],[2870,378,55,12]], checkpoint:[2200,280], portal:[3050,314]}
  ];

  let levelIndex=0, world, player, camera=0, running=false, paused=false, finished=false;
  let score=0, elapsed=0, lives=3, totalCoins=0, checkpoint=null, levelStartTime=0;
  let last=0, animTime=0, soundOn=true, audioCtx=null, overlayAction=null;
  const keys = {left:false,right:false,jump:false};
  const touch = {left:false,right:false,jump:false};
  let particles=[], floatingTexts=[];
  const rand=(a,b)=>a+Math.random()*(b-a);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const rect=(x,y,w,h)=>({x,y,w,h});
  const intersect=(a,b)=>a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  const playerBox=()=>({x:player.x,y:player.y,w:player.w,h:player.h});
  const getInput=(name)=>keys[name]||touch[name];

  function sound(freq=440,duration=.08,type="sine",volume=.035){
    if(!soundOn)return;
    try{
      audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
      if(audioCtx.state==="suspended")audioCtx.resume();
      const osc=audioCtx.createOscillator(), gain=audioCtx.createGain();
      osc.type=type;osc.frequency.setValueAtTime(freq,audioCtx.currentTime);
      gain.gain.setValueAtTime(volume,audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);
      osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+duration);
    }catch(_){}
  }
  function sfx(name){
    if(name==="coin"){sound(880,.07,"triangle",.045);setTimeout(()=>sound(1175,.1,"triangle",.035),45)}
    if(name==="jump")sound(270,.12,"square",.018);
    if(name==="hit"){sound(170,.2,"sawtooth",.035)}
    if(name==="checkpoint"){sound(523,.1,"triangle");setTimeout(()=>sound(659,.1,"triangle"),100);setTimeout(()=>sound(784,.16,"triangle"),200)}
    if(name==="portal"){sound(440,.15,"sine");setTimeout(()=>sound(660,.15,"sine"),100);setTimeout(()=>sound(880,.24,"sine"),200)}
    if(name==="stomp")sound(120,.09,"square",.025);
  }
  function createWorld(index){
    const data=levels[index];
    world={
      data, platforms:data.platforms.map(p=>({x:p[0],y:p[1],w:p[2],h:p[3]})),
      coins:data.coins.map((p,i)=>({x:p[0],y:p[1],r:10,got:false,phase:i*.7})),
      enemies:data.enemies.map((p,i)=>({x:p[0],y:p[1],baseY:p[1],w:34,h:30,min:p[2],max:p[3],dir:i%2?1:-1,speed:65+i%3*13,alive:true,phase:i})),
      hazards:data.hazards.map(p=>({x:p[0],y:p[1],w:p[2],h:p[3]})),
      checkpoint:{x:data.checkpoint[0],y:data.checkpoint[1],active:false},
      portal:{x:data.portal[0],y:data.portal[1],w:38,h:64}
    };
    player={x:60,y:390,w:30,h:40,vx:0,vy:0,onGround:false,invuln:0,face:1,anim:0};
    camera=0;particles=[];floatingTexts=[];totalCoins=0;checkpoint=null;
    updateUI();
  }
  function resetRun(){
    levelIndex=0;score=0;elapsed=0;lives=3;finished=false;running=false;paused=false;
    createWorld(levelIndex);ui.startOverlay.classList.remove("hidden");ui.pauseOverlay.classList.add("hidden");ui.messageOverlay.classList.add("hidden");
    ui.pauseLabel.textContent="Pause";ui.pauseBtn.disabled=false;updateUI();draw();
  }
  function startGame(){running=true;paused=false;finished=false;ui.startOverlay.classList.add("hidden");ui.pauseOverlay.classList.add("hidden");ui.messageOverlay.classList.add("hidden");last=performance.now();sound(520,.08,"triangle");}
  function togglePause(){
    if(!running||finished)return;
    paused=!paused;ui.pauseOverlay.classList.toggle("hidden",!paused);ui.pauseLabel.textContent=paused?"Resume":"Pause";
    if(!paused)last=performance.now();
  }
  function showMessage(icon,eyebrow,title,text,button,action){
    paused=true;ui.messageIcon.textContent=icon;ui.messageEyebrow.textContent=eyebrow;ui.messageTitle.textContent=title;ui.messageText.textContent=text;ui.messageBtn.innerHTML=button+' <span>→</span>';
    ui.messageOverlay.classList.remove("hidden");overlayAction=action;
  }
  function nextLevel(){
    ui.messageOverlay.classList.add("hidden");
    if(levelIndex>=levels.length-1){finished=true;running=false;paused=false;ui.pauseBtn.disabled=true;showMessage("🏆","QUEST COMPLETE","Legendary explorer!","You conquered all three worlds. Final score: "+score.toLocaleString()+".","Play Again",()=>resetRun());return;}
    levelIndex++;createWorld(levelIndex);paused=false;running=true;last=performance.now();ui.levelName.textContent=`Level ${levelIndex+1} · ${world.data.name}`;ui.messageOverlay.classList.add("hidden");updateUI();
  }
  function updateUI(){
    ui.levelName.textContent=`Level ${levelIndex+1} · ${world.data.name}`;
    ui.worldLabel.textContent=`WORLD 0${levelIndex+1}`;ui.objectiveLabel.textContent="FIND THE PORTAL";
    ui.score.textContent=String(score).padStart(5,"0");ui.coins.textContent=`${totalCoins} / ${world.coins.length}`;
    ui.hearts.textContent=lives>0?("♥ ".repeat(lives)).trim():"—";
    ui.level.textContent=`0${levelIndex+1} / 0${levels.length}`;
    ui.time.textContent=formatTime(elapsed);
    const progress=clamp(Math.round((player.x/world.data.length)*100),0,100);
    ui.progress.textContent=progress+"%";ui.progressBar.style.width=progress+"%";
    ui.missionTitle.textContent=world.data.mission;ui.missionText.textContent=totalCoins>=world.coins.length?"All coins found! Head to the portal.":"Collect coins and follow the trail to the portal.";
    ui.checkpoint.textContent=world.checkpoint.active?"Checkpoint: saved":"Checkpoint: not reached";
    document.querySelector(".checkpoint-state").classList.toggle("reached",world.checkpoint.active);
  }
  function formatTime(t){const s=Math.floor(t),m=Math.floor(s/60);return String(m).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
  function burst(x,y,color,count=10){
    for(let i=0;i<count;i++)particles.push({x,y,vx:rand(-150,150),vy:rand(-210,30),life:rand(.25,.65),max:.65,size:rand(3,7),color});
  }
  function floatText(x,y,text,color="#fff0a8"){floatingTexts.push({x,y,text,color,life:1})}
  function movePlayer(dt){
    const left=getInput("left"),right=getInput("right"),jump=getInput("jump");
    const speed=260,accel=1900;
    if(left){player.vx-=accel*dt;player.face=-1}else if(right){player.vx+=accel*dt;player.face=1}else player.vx*=Math.pow(.0008,dt);
    player.vx=clamp(player.vx,-speed,speed);
    if(jump&&player.onGround){player.vy=-650;player.onGround=false;sfx("jump");}
    player.vy+=GRAVITY*dt;player.vy=Math.min(player.vy,950);
    player.x+=player.vx*dt;
    let box=playerBox();
    for(const p of world.platforms){if(intersect(box,p)){if(player.vx>0)player.x=p.x-player.w;else if(player.vx<0)player.x=p.x+p.w;player.vx=0;box=playerBox();}}
    player.y+=player.vy*dt;player.onGround=false;box=playerBox();
    for(const p of world.platforms){if(intersect(box,p)){if(player.vy>0){player.y=p.y-player.h;player.onGround=true;}else if(player.vy<0){player.y=p.y+p.h;}player.vy=0;box=playerBox();}}
    player.x=clamp(player.x,0,world.data.length-player.w);player.anim+=Math.abs(player.vx)*dt*.035;
    if(player.invuln>0)player.invuln-=dt;
    if(player.y>H+180)damage();
  }
  function damage(){
    if(player.invuln>0||paused||finished)return;
    lives--;sfx("hit");burst(player.x+15,Math.min(player.y+20,H-20),"#ff8197",14);
    if(lives<=0){
      running=false;paused=true;
      showMessage("♥","QUEST PAUSED","Out of hearts","Your adventure can start over. Try using checkpoints and watching enemy patterns.","Try Again",()=>resetRun());
      return;
    }
    player.invuln=1.6;
    if(checkpoint){player.x=checkpoint.x;player.y=checkpoint.y-player.h-2;player.vx=0;player.vy=0;}
    else {player.x=60;player.y=360;player.vx=0;player.vy=0;}
  }
  function updateWorld(dt){
    movePlayer(dt);
    for(const e of world.enemies){if(!e.alive)continue;e.x+=e.dir*e.speed*dt;if(e.x<e.min){e.x=e.min;e.dir=1}if(e.x+e.w>e.max){e.x=e.max-e.w;e.dir=-1}e.phase+=dt*6;
      if(intersect(playerBox(),e)){
        const playerBottom=player.y+player.h;
        if(player.vy>80&&playerBottom-e.y<22){e.alive=false;player.vy=-390;score+=100;burst(e.x+e.w/2,e.y+12,"#c7ff8b",12);floatText(e.x,e.y-5,"+100");sfx("stomp")}
        else damage();
      }
    }
    for(const c of world.coins){if(c.got)continue;const bob=Math.sin(animTime*3+c.phase)*5;const coinRect={x:c.x-9,y:c.y-9+bob,w:18,h:18};if(intersect(playerBox(),coinRect)){c.got=true;totalCoins++;score+=50;burst(c.x,c.y,"#ffd166",8);floatText(c.x,c.y-12,"+50");sfx("coin")}}
    for(const h of world.hazards){if(intersect(playerBox(),h))damage()}
    const cp=world.checkpoint;
    if(!cp.active&&intersect(playerBox(),{x:cp.x,y:cp.y,w:32,h:115})){cp.active=true;checkpoint={x:cp.x,y:cp.y};score+=150;burst(cp.x+10,cp.y+15,"#9ff3ff",18);floatText(cp.x,cp.y-8,"CHECKPOINT!","#9ff3ff");sfx("checkpoint");}
    if(intersect(playerBox(),world.portal)){score+=250;running=false;paused=true;sfx("portal");if(levelIndex===levels.length-1){showMessage("🏆","QUEST COMPLETE","Legendary explorer!","You conquered all three worlds. Final score: "+score.toLocaleString()+".","Play Again",()=>resetRun());finished=true;}else showMessage("✦","LEVEL COMPLETE",world.data.name+" cleared!","Coins collected: "+totalCoins+" · Bonus earned: +250","Next World",()=>nextLevel());}
    camera=clamp(player.x-W*.36,0,world.data.length-W);
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=450*dt;p.life-=dt}
    particles=particles.filter(p=>p.life>0);
    for(const f of floatingTexts){f.y-=30*dt;f.life-=dt}
    floatingTexts=floatingTexts.filter(f=>f.life>0);
  }
  function rounded(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
  function drawBackground(){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,world.data.sky[0]);g.addColorStop(1,world.data.sky[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    // Distant floating clouds
    for(let i=0;i<9;i++){let x=((i*173-camera*.18+animTime*8)%(W+180)+W+180)%(W+180)-80,y=65+(i%4)*48;ctx.fillStyle="#ffffff50";ctx.fillRect(x,y,54,12);ctx.fillRect(x+13,y-9,29,17);ctx.fillRect(x+35,y-3,24,15)}
    // Layered hills
    for(let layer=0;layer<3;layer++){
      ctx.fillStyle=layer===0?"#2e7d79a8":layer===1?"#3a8b78b8":"#438b6c";
      ctx.beginPath();ctx.moveTo(0,H);
      for(let x=-80;x<=W+80;x+=80){let wx=x+camera*(.13+layer*.11);let y=350+layer*36+Math.sin(wx*.009+layer)*25+Math.sin(wx*.021)*11;ctx.lineTo(x,y)}
      ctx.lineTo(W,H);ctx.closePath();ctx.fill();
    }
    // Tiny sparkles / stars
    for(let i=0;i<26;i++){let x=(i*97-camera*.07+W*3)%W,y=30+(i*47)%240;ctx.fillStyle="#ffffff70";ctx.fillRect(x,y,2,2)}
  }
  function drawPlatforms(){
    for(const p of world.platforms){const x=Math.floor(p.x-camera);if(x+p.w<0||x>W)continue;
      ctx.fillStyle="#00000018";ctx.fillRect(x,p.y+8,p.w,p.h);
      ctx.fillStyle=world.data.ground;ctx.fillRect(x,p.y,p.w,p.h);
      ctx.fillStyle=world.data.accent;ctx.fillRect(x,p.y,p.w,7);
      ctx.fillStyle="#ffffff20";ctx.fillRect(x,p.y+9,p.w,3);
      for(let tx=x+8;tx<x+p.w;tx+=30){ctx.fillStyle="#102a3a25";ctx.fillRect(tx,p.y+21,12,5);ctx.fillRect(tx+9,p.y+39,8,4)}
    }
  }
  function drawCoin(c){
    if(c.got)return;const bob=Math.sin(animTime*3+c.phase)*5,x=c.x-camera,y=c.y+bob;
    ctx.save();ctx.translate(x,y);ctx.scale(.72+Math.abs(Math.sin(animTime*5+c.phase))*.28,1);
    ctx.fillStyle="#9b641d";ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#ffd166";ctx.beginPath();ctx.arc(0,0,8.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff2ac";ctx.fillRect(-2,-5,4,10);ctx.fillRect(-4,-2,8,4);
    ctx.restore();
  }
  function drawEnemy(e){
    if(!e.alive)return;const x=e.x-camera,y=e.y+Math.sin(e.phase)*2;
    ctx.fillStyle="#00000025";ctx.fillRect(x+3,y+e.h-1,e.w-6,5);
    rounded(x,y+5,e.w,e.h-5,10,"#8b65d8");ctx.fillStyle="#b39aff";ctx.fillRect(x+5,y+5,e.w-10,5);
    ctx.fillStyle="#5e48a4";ctx.fillRect(x+4,y+e.h-7,8,7);ctx.fillRect(x+e.w-12,y+e.h-7,8,7);
    ctx.fillStyle="#fff";ctx.fillRect(x+8,y+12,6,7);ctx.fillRect(x+21,y+12,6,7);
    ctx.fillStyle="#27233e";ctx.fillRect(x+10,y+14,3,4);ctx.fillRect(x+23,y+14,3,4);
    ctx.fillStyle="#f5d9ff";ctx.fillRect(x+13,y+23,9,3);
  }
  function drawHazard(h){
    const x=h.x-camera;ctx.fillStyle="#a34458";ctx.fillRect(x,h.y,h.w,h.h);
    ctx.fillStyle="#ff8297";for(let i=0;i<h.w;i+=18){ctx.beginPath();ctx.moveTo(x+i,h.y);ctx.lineTo(x+i+9,h.y-14);ctx.lineTo(x+i+18,h.y);ctx.closePath();ctx.fill()}
  }
  function drawCheckpoint(){
    const cp=world.checkpoint,x=cp.x-camera;
    ctx.fillStyle="#344f63";ctx.fillRect(x,cp.y,5,114);
    ctx.fillStyle=cp.active?"#9ff3ff":"#c7d7e7";ctx.beginPath();ctx.moveTo(x+5,cp.y+4);ctx.lineTo(x+37,cp.y+14);ctx.lineTo(x+5,cp.y+26);ctx.closePath();ctx.fill();
    if(cp.active){ctx.globalAlpha=.22+Math.sin(animTime*5)*.08;ctx.fillStyle="#9ff3ff";ctx.beginPath();ctx.arc(x+8,cp.y+15,30,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
  }
  function drawPortal(){
    const p=world.portal,x=p.x-camera,y=p.y;ctx.save();
    ctx.globalAlpha=.15+Math.sin(animTime*4)*.07;ctx.fillStyle=world.data.accent;ctx.beginPath();ctx.ellipse(x+p.w/2,y+p.h/2,p.w*1.5,p.h*.85,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    ctx.fillStyle="#172b43";ctx.beginPath();ctx.ellipse(x+p.w/2,y+p.h/2,p.w/2,p.h/2,0,0,Math.PI*2);ctx.fill();
    const g=ctx.createLinearGradient(x,y,x+p.w,y+p.h);g.addColorStop(0,world.data.accent);g.addColorStop(1,"#8e8bff");ctx.strokeStyle=g;ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(x+p.w/2,y+p.h/2,p.w/2-2,p.h/2-2,0,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle="#ffffffaa";ctx.beginPath();ctx.ellipse(x+p.w/2-4,y+p.h/2-3,5,12,-.4,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function drawPlayer(){
    if(player.invuln>0&&Math.floor(animTime*14)%2===0)return;
    const x=Math.floor(player.x-camera),y=Math.floor(player.y),step=player.onGround?Math.sin(player.anim)*3:0;
    ctx.fillStyle="#00000025";ctx.fillRect(x+2,y+player.h+1,player.w-4,5);
    // Backpack and body
    ctx.fillStyle="#e46c54";ctx.fillRect(x+3,y+15,player.w-6,22);
    ctx.fillStyle="#ff9b6e";ctx.fillRect(x+5,y+17,player.w-10,5);
    ctx.fillStyle="#35506d";ctx.fillRect(x+4,y+33,9,7+Math.max(0,step));ctx.fillRect(x+18,y+33,9,7-Math.min(0,step));
    // Head and hair
    ctx.fillStyle="#f7c99a";ctx.fillRect(x+5,y+3,21,17);
    ctx.fillStyle="#28364e";ctx.fillRect(x+4,y+1,23,7);ctx.fillRect(x+3,y+6,5,7);
    ctx.fillStyle="#243249";ctx.fillRect(x+(player.face===1?19:8),y+10,3,4);
    ctx.fillStyle="#fff2c7";ctx.fillRect(x+9,y+15,11,2);
    ctx.fillStyle="#ffd166";ctx.fillRect(x+9,y+23,12,4);
    ctx.fillStyle="#ffffff70";ctx.fillRect(x+7,y+19,4,8);
  }
  function drawHUDinGame(){
    ctx.fillStyle="#102035a8";ctx.fillRect(14,14,165,37);ctx.fillStyle="#f3f8ff";ctx.font="bold 13px monospace";ctx.fillText("✦ "+String(score).padStart(5,"0"),26,37);
    ctx.fillStyle="#102035a8";ctx.fillRect(W-130,14,116,37);ctx.fillStyle="#ffd166";ctx.font="bold 12px monospace";ctx.fillText("● "+totalCoins+" / "+world.coins.length,W-115,37);
  }
  function draw(){
    drawBackground();ctx.save();ctx.translate(0,0);
    drawPlatforms();world.hazards.forEach(drawHazard);drawCheckpoint();drawPortal();world.coins.forEach(drawCoin);world.enemies.forEach(drawEnemy);drawPlayer();
    for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x-camera,p.y,p.size,p.size)}ctx.globalAlpha=1;
    for(const f of floatingTexts){ctx.globalAlpha=clamp(f.life,0,1);ctx.fillStyle=f.color;ctx.font="bold 13px monospace";ctx.textAlign="center";ctx.fillText(f.text,f.x-camera,f.y)}ctx.globalAlpha=1;ctx.textAlign="left";
    drawHUDinGame();ctx.restore();
  }
  function frame(now){
    requestAnimationFrame(frame);const dt=Math.min((now-last)/1000||0,.033);last=now;animTime+=dt;
    if(running&&!paused&&!finished){elapsed+=dt;updateWorld(dt);updateUI()}
    draw();
  }
  function keydown(e){
    const k=e.key.toLowerCase();
    if(["arrowleft","arrowright","arrowup"," ","arrowdown"].includes(k))e.preventDefault();
    if(k==="arrowleft"||k==="a")keys.left=true;
    if(k==="arrowright"||k==="d")keys.right=true;
    if(k===" "||k==="arrowup"||k==="w"||k==="z")keys.jump=true;
    if(k==="p"||k==="escape")togglePause();
    if(k==="enter"&&!running&&!finished){if(!ui.startOverlay.classList.contains("hidden"))startGame();else if(!ui.messageOverlay.classList.contains("hidden")&&overlayAction)overlayAction()}
  }
  function keyup(e){
    const k=e.key.toLowerCase();
    if(k==="arrowleft"||k==="a")keys.left=false;
    if(k==="arrowright"||k==="d")keys.right=false;
    if(k===" "||k==="arrowup"||k==="w"||k==="z")keys.jump=false;
  }
  function bindHold(id,name){
    const el=$(id);
    const down=e=>{e.preventDefault();touch[name]=true;try{el.setPointerCapture(e.pointerId)}catch(_){}};
    const up=e=>{e.preventDefault();touch[name]=false};
    el.addEventListener("pointerdown",down);["pointerup","pointercancel","lostpointercapture","pointerleave"].forEach(ev=>el.addEventListener(ev,up));
  }
  window.addEventListener("keydown",keydown,{passive:false});window.addEventListener("keyup",keyup);
  window.addEventListener("blur",()=>{keys.left=keys.right=keys.jump=touch.left=touch.right=touch.jump=false});
  bindHold("leftBtn","left");bindHold("rightBtn","right");bindHold("jumpBtn","jump");
  $("startBtn").addEventListener("click",startGame);$("resumeBtn").addEventListener("click",togglePause);
  ui.pauseBtn.addEventListener("click",togglePause);
  ui.soundBtn.addEventListener("click",()=>{soundOn=!soundOn;ui.soundLabel.textContent=soundOn?"Sound On":"Sound Off";ui.soundBtn.classList.toggle("muted",!soundOn);if(soundOn)sound(660,.08)});
  ui.messageBtn.addEventListener("click",()=>{if(overlayAction){const action=overlayAction;overlayAction=null;action()}});
  $("restartBtn").addEventListener("click",resetRun);
  createWorld(0);requestAnimationFrame(frame);
})();
