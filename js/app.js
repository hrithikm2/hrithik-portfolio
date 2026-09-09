
    const journey = document.getElementById('journey');
    const worldPane = document.getElementById('worldPane');
    const world = document.getElementById('world');
    const path = document.getElementById('careerPath');
    const knight = document.getElementById('knight');
    const pickupBurst = document.getElementById('pickupBurst');
    const upgradeToast = document.getElementById('upgradeToast');
    const finalPanel = document.getElementById('finalPanel');
    const storyPane = document.getElementById('storyPane');
    const story = document.getElementById('story');
    const handoffPlate = document.getElementById('handoffPlate');
    const videoStage = document.getElementById('videoStage');
    const transitionVideo = document.getElementById('transitionVideo');
    const tppScene = document.getElementById('tppScene');
    const tppKnight = document.getElementById('tppKnight');
    const futureCopy = document.getElementById('futureCopy');
    const roadCaption = document.querySelector('.roadCaption');
    const mobileStageIndex = document.getElementById('mobileStageIndex');
    const mobileStageYears = document.getElementById('mobileStageYears');
    const mobileStageDot = document.getElementById('mobileStageDot');
    const mobileProgressLabel = document.getElementById('mobileProgressLabel');
    const mobileProgressRail = document.getElementById('mobileProgressRail');
    const mobileNextTitle = document.getElementById('mobileNextTitle');
    const mobileNextEyebrow = document.getElementById('mobileNextEyebrow');
    const sceneEls = [0,1,2,3].map(i=>document.getElementById('scene'+i));
    const totalLength = path.getTotalLength();
    let smoothP = 0;
    let targetP = 0;
    let lastChapter = -1;
    let lastArmor = 'bronze';
    let previousGemCount = 0;
    let viewportScale = 1;
    let lastTime = performance.now();
    let previousSmoothP = 0;
    let walkPhase = 0;

    // Preserve the existing career pacing in the first ~78% of the long scroll,
    // then reserve a generous scroll range for the six-second Flow transition.
    const CAREER_SCROLL_END = .78;
    const HANDOFF_START = .932;
    const HANDOFF_P = .948;
    const HANDOFF_END = .952;
    const HANDOFF_ARTBOARD_W = 1000;
    const HANDOFF_ARTBOARD_H = 562.5; // 16:9
    const VIDEO_BLEND_START = .755;
    const VIDEO_START = .780;
    const VIDEO_END = .985;
    const forceHandoff = new URLSearchParams(location.search).has('handoff');
    let basePane = null;
    let videoDuration = 6;
    let videoReady = false;
    let previousCareerP = 0;
    const isMobileLayout = ()=>innerWidth<=760;

    const fields = {
      index:document.getElementById('chapterIndex'),years:document.getElementById('chapterYears'),title:document.getElementById('chapterTitle'),body:document.getElementById('chapterBody'),challenge:document.getElementById('chapterChallenge'),growth:document.getElementById('chapterGrowth'),proof:document.getElementById('chapterProof'),kit:document.getElementById('chapterKit'),armorText:document.getElementById('armorText'),armorDot:document.getElementById('armorDot')
    };

    const encounterEls = [];
    gemDefs.forEach((g,i)=>{
      const demonP=g.p;
      const gemP=Math.min(.985,g.p+.020);
      const demonPt=path.getPointAtLength(totalLength*demonP);
      const gemPt=path.getPointAtLength(totalLength*gemP);
      const side=demonPt.x>520?'side-left':'side-right';

      const demon=document.createElement('div');
      demon.className=`demon type-${i%3} ${side}${g.dark?' dark':''}`;
      demon.style.left=demonPt.x+'px'; demon.style.top=(demonPt.y-8)+'px';
      demon.innerHTML=`
        <div class="demonHalo"></div>
        <svg viewBox="0 0 100 110" aria-hidden="true">
          <path class="demonShade" d="M24 36 C12 20 14 8 31 5 C27 17 31 25 39 29 C45 14 54 14 61 29 C70 25 75 16 72 5 C89 10 90 24 78 38 C87 48 86 72 74 91 C65 103 35 103 26 91 C14 72 14 48 24 36 Z"/>
          <path class="demonBody" d="M29 38 C34 25 66 25 72 38 L79 71 C72 92 61 101 50 101 C39 101 28 92 21 71 Z"/>
          <path class="demonShade" d="M20 57 L7 75 L22 70 Z M80 57 L93 75 L78 70 Z"/>
          <circle class="demonEye" cx="40" cy="48" r="4"/><circle class="demonEye" cx="60" cy="48" r="4"/>
          <path class="demonCore" d="M50 57 L58 66 L50 80 L42 66 Z"/>
          <path class="demonCoreInner" d="M50 60 L54 66 L50 73 L46 66 Z"/>
          <path d="M39 86 Q50 91 61 86" fill="none" stroke="rgba(255,255,255,.24)" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <div class="demonLabel"><span>Challenge</span><strong>${g.challenge}</strong><em>Defeat → ${g.reward} gem</em></div>`;
      world.appendChild(demon);

      const gem=document.createElement('div');
      gem.className='gem'; gem.style.left=gemPt.x+'px'; gem.style.top=(gemPt.y-7)+'px'; gem.dataset.i=i;
      world.appendChild(gem);

      encounterEls.push({demon,gem,demonP,gemP,demonPt,gemPt,def:g});
    });

    // These are not completed career encounters. They are deliberately unresolved
    // future challenges and remain visible in the clean handoff frame. Their gems
    // stay embedded inside them until a future battle.
    const futureEncounterPs=[.968,.982,.996];
    const futureEncounterEls=futureEncounterPs.map((fp,i)=>{
      const fpt=path.getPointAtLength(totalLength*fp);
      const demon=document.createElement('div');
      demon.className=`demon futureDemon type-${(i+1)%3} ${fpt.x>520?'side-left':'side-right'} dark`;
      demon.style.left=fpt.x+'px'; demon.style.top=(fpt.y-8)+'px';
      demon.innerHTML=`
        <div class="demonHalo"></div>
        <svg viewBox="0 0 100 110" aria-hidden="true">
          <path class="demonShade" d="M24 36 C12 20 14 8 31 5 C27 17 31 25 39 29 C45 14 54 14 61 29 C70 25 75 16 72 5 C89 10 90 24 78 38 C87 48 86 72 74 91 C65 103 35 103 26 91 C14 72 14 48 24 36 Z"/>
          <path class="demonBody" d="M29 38 C34 25 66 25 72 38 L79 71 C72 92 61 101 50 101 C39 101 28 92 21 71 Z"/>
          <path class="demonShade" d="M20 57 L7 75 L22 70 Z M80 57 L93 75 L78 70 Z"/>
          <circle class="demonEye" cx="40" cy="48" r="4"/><circle class="demonEye" cx="60" cy="48" r="4"/>
          <path class="demonCore" d="M50 57 L58 66 L50 80 L42 66 Z"/>
          <path class="demonCoreInner" d="M50 60 L54 66 L50 73 L46 66 Z"/>
        </svg>`;
      world.appendChild(demon);
      return {demon,p:fp,pt:fpt};
    });

    function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
    function lerp(a,b,t){return a+(b-a)*t}
    function pageProgress(){
      if(forceHandoff) return CAREER_SCROLL_END*HANDOFF_END;
      const rect=journey.getBoundingClientRect();
      const span=rect.height-innerHeight;
      return clamp(-rect.top/span,0,1);
    }
    function chapterFor(p){let i=0;for(let n=0;n<chapters.length;n++)if(p>=chapters[n].p)i=n;return i}

    function setChapter(i){
      if(i===lastChapter)return;
      story.classList.add('fade');
      setTimeout(()=>{
        const c=chapters[i];
        fields.index.textContent=String(i+1).padStart(2,'0')+' / 08'; fields.years.textContent=c.years; fields.title.innerHTML=c.title; fields.body.textContent=c.body; fields.challenge.textContent=c.challenge; fields.growth.textContent=c.growth; fields.proof.textContent=c.proof; fields.kit.textContent=c.kit;
        if(mobileStageIndex) mobileStageIndex.textContent=String(i+1).padStart(2,'0')+' / 08';
        if(mobileStageYears) mobileStageYears.textContent=c.years;
        if(mobileProgressLabel) mobileProgressLabel.textContent=String(i+1).padStart(2,'0')+' / 08';
        if(mobileProgressRail){
          [...mobileProgressRail.children].forEach((dot,idx)=>{dot.classList.toggle('done',idx<i);dot.classList.toggle('current',idx===i)});
        }
        if(mobileNextTitle){
          const next=chapters[Math.min(i+1,chapters.length-1)];
          mobileNextTitle.textContent=next.title.replace(/<[^>]+>/g,'').replace(/\.$/,'');
          if(mobileNextEyebrow) mobileNextEyebrow.textContent=i===chapters.length-1?'Keep going':'Next chapter';
        }
        story.classList.remove('fade');
      },130);
      lastChapter=i;
    }

    function armorForCount(count){
      if(count>=9)return 'emerald';
      if(count>=6)return 'gold';
      if(count>=3)return 'silver';
      return 'bronze';
    }
    function applyArmor(stage,announce=false){
      const palette={
        bronze:{main:'#a8663b',dark:'#75452c',light:'#c98c63',cape:'#6f4536',plume:'#75452c',text:'Bronze armor · apprentice'},
        silver:{main:'#c5cbd2',dark:'#858d98',light:'#f0f2f4',cape:'#56616d',plume:'#818996',text:'Silver armor · leader'},
        gold:{main:'#d3a643',dark:'#8f6e25',light:'#f1d987',cape:'#6c5130',plume:'#b3832f',text:'Gold armor · architect'},
        /* Video-matched final evolution: aged steel shell with emerald energy/cape. */
        emerald:{main:'#7f9187',dark:'#30473d',light:'#c5d0c9',cape:'#163a2d',plume:'#315f4b',text:'Emerald armor · builder / owner'}
      }[stage];
      knight.style.setProperty('--armor-main',palette.main); knight.style.setProperty('--armor-dark',palette.dark); knight.style.setProperty('--armor-light',palette.light); knight.style.setProperty('--cape',palette.cape); knight.style.setProperty('--plume',palette.plume);
      knight.style.setProperty('--capeOpacity',stage==='bronze'?'.34':stage==='silver'?'.48':stage==='gold'?'.72':'.88'); knight.style.setProperty('--plumeOpacity',stage==='bronze'?'.28':stage==='silver'?'.45':stage==='gold'?'.72':'1');
      knight.classList.toggle('final',stage==='emerald'); fields.armorText.textContent=palette.text; const armorIndicator=stage==='emerald'?'#3aa27a':palette.main; fields.armorDot.style.background=armorIndicator; fields.armorDot.style.boxShadow=`0 0 0 4px ${armorIndicator}22`; if(mobileStageDot){mobileStageDot.style.background=armorIndicator;mobileStageDot.style.boxShadow=`0 0 0 3px ${armorIndicator}2b`;} document.documentElement.style.setProperty('--mobile-accent',armorIndicator);
      if(announce){
        upgradeToast.textContent=stage.charAt(0).toUpperCase()+stage.slice(1)+' armor unlocked'; upgradeToast.classList.add('show'); setTimeout(()=>upgradeToast.classList.remove('show'),1250);
      }
    }

    function updateScenes(p){
      const o0=1-clamp((p-.14)/.2,0,1); const o1=clamp((p-.10)/.20,0,1)*(1-clamp((p-.45)/.18,0,1)); const o2=clamp((p-.35)/.22,0,1)*(1-clamp((p-.76)/.18,0,1)); const o3=clamp((p-.66)/.22,0,1);
      [o0,o1,o2,o3].forEach((o,i)=>sceneEls[i].style.opacity=o);
    }

    function measureBasePane(){
      worldPane.style.left=''; worldPane.style.top=''; worldPane.style.right=''; worldPane.style.bottom='';
      const r=worldPane.getBoundingClientRect();
      basePane={left:r.left,top:r.top,right:innerWidth-r.right,bottom:innerHeight-r.bottom,width:r.width,height:r.height};
      viewportScale=r.width/1000;
    }

    function updateLayout(){
      measureBasePane();
    }

    function updateEncounters(p){
      let collected=0;
      let fighting=false;
      encounterEls.forEach((e,i)=>{
        const approachStart=e.demonP-.040;
        const fightStart=e.demonP-.010;
        const defeatAt=e.demonP+.008;
        const collectAt=e.gemP+.010;
        const defeated=p>=defeatAt;
        const collectedNow=p>=collectAt;
        const approaching=p>=approachStart && p<fightStart;
        const engaged=p>=fightStart && p<defeatAt;
        const gemAvailable=defeated && !collectedNow;

        e.demon.classList.toggle('approach',approaching);
        e.demon.classList.toggle('engaged',engaged);
        e.demon.classList.toggle('defeated',defeated);
        e.gem.classList.toggle('available',gemAvailable);
        e.gem.classList.toggle('near',gemAvailable && (collectAt-p)<.020);
        e.gem.classList.toggle('consumed',collectedNow);
        if(engaged) fighting=true;
        if(collectedNow) collected++;
      });

      knight.classList.toggle('attacking',fighting);

      if(collected>previousGemCount){
        const e=encounterEls[collected-1];
        pickupBurst.style.left=e.gemPt.x+'px'; pickupBurst.style.top=e.gemPt.y+'px';
        pickupBurst.classList.remove('live'); void pickupBurst.offsetWidth; pickupBurst.classList.add('live');
        knight.classList.remove('gem-charged'); void knight.offsetWidth; knight.classList.add('gem-charged');
        setTimeout(()=>knight.classList.remove('gem-charged'),1100);
        upgradeToast.textContent=`${e.def.reward} absorbed`;
        upgradeToast.classList.add('show');
        setTimeout(()=>upgradeToast.classList.remove('show'),900);
      }
      previousGemCount=collected;
      return collected;
    }


    function smoothstep01(t){t=clamp(t,0,1);return t*t*(3-2*t)}

    function updateHandoffState(p){
      const raw=forceHandoff ? 1 : clamp((p-HANDOFF_START)/(HANDOFF_P-HANDOFF_START),0,1);
      const t=smoothstep01(raw);
      const settled=forceHandoff || p>=HANDOFF_P;
      document.body.classList.toggle('handoff-ready',t>.001);

      // Keep the portfolio chrome/story visible. Only low-value game captions
      // disappear so the left chapter UI can remain as an overlay on the video.
      const topbar=document.querySelector('.topbar');
      topbar.style.opacity='1';
      topbar.style.transform='none';
      storyPane.style.opacity='1';
      storyPane.style.transform='none';
      roadCaption.style.opacity=String(1-t);
      upgradeToast.style.opacity=String(1-t);

      // Expand the live world into a full-screen 16:9-cover stage. This mirrors
      // the way the future video will be displayed, eliminating a geometry jump.
      if(!basePane) measureBasePane();
      const mobile=isMobileLayout();
      const left=mobile?basePane.left:lerp(basePane.left,0,t);
      const top=mobile?basePane.top:lerp(basePane.top,0,t);
      const right=mobile?basePane.right:lerp(basePane.right,0,t);
      const bottom=mobile?basePane.bottom:lerp(basePane.bottom,0,t);
      worldPane.style.left=`${left}px`;
      worldPane.style.top=`${top}px`;
      worldPane.style.right=`${right}px`;
      worldPane.style.bottom=`${bottom}px`;
      /* Fade from the live CSS/SVG world into the literal first decoded video frame.
         This is the point where the website background + character become 1:1 with Flow. */
      handoffPlate.style.visibility=t>.001?'visible':'hidden';
      handoffPlate.style.opacity=String(t);
      worldPane.style.opacity=String(1-t);
      worldPane.style.filter='none';
      worldPane.style.transform='none';

      // Old CSS/SVG faux-TPP is intentionally disabled. The real camera shift
      // will be supplied by the scroll-scrubbed Flow video in the next step.
      tppScene.style.opacity='0';
      tppScene.style.pointerEvents='none';
      finalPanel.classList.remove('show');
      futureCopy.classList.remove('show');

      futureEncounterEls.forEach((e,i)=>{
        const reveal=smoothstep01(clamp((t-(.18+i*.10))/.42,0,1));
        e.demon.style.opacity=String(reveal);
        e.demon.style.transform=`translate(-50%,-50%) scale(${lerp(.82,1,reveal)})`;
      });

      return {t,settled};
    }

    function updateVideoStage(p){
      const blend=smoothstep01(clamp((p-VIDEO_BLEND_START)/(VIDEO_START-VIDEO_BLEND_START),0,1));
      const scrub=clamp((p-VIDEO_START)/(VIDEO_END-VIDEO_START),0,1);
      const active=p>=VIDEO_BLEND_START;
      document.body.classList.toggle('video-active',active);
      videoStage.style.opacity=String(blend);
      videoStage.style.visibility=active?'visible':'hidden';
      // The video is deliberately paused: scroll position owns its timeline.
      transitionVideo.pause();
      if(videoReady){
        const fps=24;
        const endTime=Math.max(0,videoDuration-(1/fps));
        const desired=scrub*endTime;
        if(Math.abs(transitionVideo.currentTime-desired)>.012){
          try{transitionVideo.currentTime=desired}catch(e){}
        }
      }
      // The handoff plate is already the video's exact decoded frame zero. Keep it
      // underneath the video while the video fades in, eliminating a visual seam.
      if(active){handoffPlate.style.visibility='visible';handoffPlate.style.opacity='1'}
      return {blend,scrub,active};
    }

    transitionVideo.addEventListener('loadedmetadata',()=>{
      videoDuration=Number.isFinite(transitionVideo.duration)?transitionVideo.duration:6;
      videoReady=true;
      transitionVideo.pause();
      try{transitionVideo.currentTime=0}catch(e){}
    });
    transitionVideo.addEventListener('canplay',()=>{videoReady=true});

    function render(now){
      targetP=pageProgress();
      const dt=Math.min(32,now-lastTime); lastTime=now;
      const ease=1-Math.pow(.0006,dt/1000);
      smoothP += (targetP-smoothP)*Math.min(.16,ease*9);

      const careerP=clamp(smoothP/CAREER_SCROLL_END,0,1);
      const handoff=updateHandoffState(careerP);
      const visualP=Math.min(careerP,HANDOFF_P);
      const len=totalLength*visualP;
      const pt=path.getPointAtLength(len); const ahead=path.getPointAtLength(Math.min(totalLength,len+5)); const angle=Math.atan2(ahead.y-pt.y,ahead.x-pt.x)*180/Math.PI;

      const paneW=worldPane.clientWidth, paneH=worldPane.clientHeight;
      const mobile=isMobileLayout();
      const normalScale=((basePane?.width||paneW)/1000)*(mobile?1.13:1);
      const targetW=mobile?paneW:innerWidth;
      const targetH=mobile?paneH:innerHeight;
      const coverScale=Math.max(targetW/HANDOFF_ARTBOARD_W,targetH/HANDOFF_ARTBOARD_H);
      viewportScale=lerp(normalScale,coverScale,handoff.t);
      const normalScreenY=(basePane?.height||paneH)*.57;
      const handoffScreenY=targetH*.55;
      const screenY=lerp(normalScreenY,handoffScreenY,handoff.t);
      const finalXOffset=(targetW-HANDOFF_ARTBOARD_W*coverScale)/2;
      const normalXOffset=mobile?(targetW-1000*normalScale)*.52:0;
      const xOffset=lerp(normalXOffset,finalXOffset,handoff.t);
      const cameraY=screenY-pt.y*viewportScale;
      world.style.transform=`translate3d(${xOffset}px,${cameraY}px,0) scale(${viewportScale})`;
      knight.style.left=(pt.x-48)+'px'; knight.style.top=(pt.y-136)+'px';

      const deltaP=careerP-previousCareerP;
      previousCareerP=careerP;
      previousSmoothP=smoothP;
      const distancePx=deltaP*totalLength;
      walkPhase += distancePx*.115;
      const targetCareerP=clamp(targetP/CAREER_SCROLL_END,0,1);
      const remaining=Math.abs(targetCareerP-careerP);
      const walkStrength=clamp(remaining*95+Math.abs(distancePx)*.42,0,1);
      const stride=Math.sin(walkPhase);
      const opposite=Math.sin(walkPhase+Math.PI);
      const liftL=-Math.max(0,opposite)*5.6*walkStrength;
      const liftR=-Math.max(0,stride)*5.6*walkStrength;
      const bodyLift=-Math.abs(Math.sin(walkPhase*2))*3.0*walkStrength;
      knight.style.setProperty('--legL',`${stride*34*walkStrength}deg`);
      knight.style.setProperty('--legR',`${opposite*34*walkStrength}deg`);
      knight.style.setProperty('--legLY',`${liftL}px`);
      knight.style.setProperty('--legRY',`${liftR}px`);
      knight.style.setProperty('--armL',`${opposite*23*walkStrength}deg`);
      knight.style.setProperty('--armR',`${stride*23*walkStrength}deg`);
      knight.style.setProperty('--bodyLift',`${bodyLift}px`);
      knight.style.setProperty('--capeSwing',`${(-4+stride*7*walkStrength)}deg`);
      knight.style.setProperty('--plumeSwing',`${stride*5*walkStrength}deg`);
      knight.style.setProperty('--shadowScale',`${1-bodyLift*.025}`);
      knight.style.setProperty('--shadowOpacity',`${.48+.22*walkStrength}`);
      knight.classList.toggle('walking',walkStrength>.12);
      knight.style.transform=`rotate(${clamp(angle*.16,-8,8)}deg)`;

      setChapter(chapterFor(Math.min(careerP,HANDOFF_P)));
      const collected=updateEncounters(Math.min(careerP,HANDOFF_P));
      const armor=armorForCount(collected);
      if(armor!==lastArmor){lastArmor=armor;applyArmor(armor,!forceHandoff)} else applyArmor(armor,false);
      updateScenes(Math.min(careerP,HANDOFF_P));
      storyPane.classList.remove('hide');
      updateVideoStage(smoothP);

      // In the settled handoff frame the knight remains alive, but the gait is
      // intentionally held on a readable mid-stride pose for deterministic capture.
      if(handoff.settled){
        knight.style.setProperty('--legL','18deg');
        knight.style.setProperty('--legR','-18deg');
        knight.style.setProperty('--legLY','0px');
        knight.style.setProperty('--legRY','-3px');
        knight.style.setProperty('--armL','-11deg');
        knight.style.setProperty('--armR','12deg');
        knight.style.setProperty('--bodyLift','-1px');
        knight.style.setProperty('--capeSwing','2deg');
        knight.style.setProperty('--plumeSwing','2deg');
        knight.classList.add('walking');
      }
      requestAnimationFrame(render);
    }

    document.getElementById('replay').addEventListener('click',e=>{e.preventDefault();window.scrollTo({top:journey.offsetTop,behavior:'smooth'})});
    addEventListener('resize',()=>{basePane=null;measureBasePane()}); updateLayout(); setChapter(0); applyArmor(forceHandoff?'emerald':'bronze'); if(forceHandoff){smoothP=CAREER_SCROLL_END*HANDOFF_END;targetP=smoothP;previousSmoothP=smoothP;previousCareerP=HANDOFF_END} requestAnimationFrame(render);
