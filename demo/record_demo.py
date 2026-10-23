"""Re-records the captioned ThatC Life demo (with a synthesized sound track).
Needs: server running (npm start), Python + Playwright + numpy + ffmpeg.   Usage: python3 demo/record_demo.py [outdir]"""
import json, sys, threading, time, urllib.request, shutil, os, subprocess, wave
import numpy as np
from playwright.sync_api import sync_playwright
B='http://localhost:8787'; H='video'; HERE=os.path.dirname(os.path.abspath(__file__))
OUT=sys.argv[1] if len(sys.argv)>1 else '/tmp/thatc-video'; os.makedirs(OUT,exist_ok=True)
def post(p,b=None): return urllib.request.urlopen(urllib.request.Request(f'{B}{p}?h={H}',data=json.dumps(b or {}).encode(),method='POST')).read()
def state(): return json.loads(urllib.request.urlopen(f'{B}/api/state?h={H}').read())
post('/api/demo/reset')

events=[]; stop=False; vt0=[None]
def poll():
    last=None
    while not stop:
        try:
            n=state().get('notice')
            if n and n['id']!=last:
                if vt0[0]: events.append((time.time()-vt0[0]-0.12, n['sound'], n['kind'], n.get('source')))
                last=n['id']
        except Exception: pass
        time.sleep(0.15)
th=threading.Thread(target=poll,daemon=True); th.start()

raw=os.path.join(OUT,'raw'); shutil.rmtree(raw,ignore_errors=True)
with sync_playwright() as p:
    br=p.chromium.launch(); ctx=br.new_context(viewport={'width':1920,'height':1080},record_video_dir=raw,record_video_size={'width':1920,'height':1080})
    vt0[0]=time.time(); pg=ctx.new_page(); pg.goto(B+'/public/stage.html'); pg.wait_for_timeout(2500)
    al=pg.frame_locator('#alf'); T0=time.time()
    log=lambda s:print(f'{time.time()-T0:6.1f}s  {s}',flush=True)
    def cap(k,m,s='',c=None): pg.evaluate('([k,m,s,c])=>cap(k,m,s,c)',[k,m,s,c])
    def card(h): pg.evaluate('h=>card(h)',h)
    pending=[None]
    def nxt(*a): pending[0]=a
    def say(t):
        al.locator('#q').fill(''); al.locator('#q').press_sequentially(t,delay=14); pg.wait_for_timeout(250); al.locator('#q').press('Enter'); log('SAY '+t)
        if pending[0]: cap(*pending[0]); pending[0]=None
    def adv(m): post('/api/demo/advance',{'minutes':m}); log(f'ADV {m}')
    def wait(s): pg.wait_for_timeout(int(s*1000))
    def mode(): return (state().get('assessment') or {}).get('mode')

    cap('','','')
    card('<h1>Every AI answers the same<br>whether you have <em>2 hours</em><br>or <em>20 minutes</em>.</h1>'); wait(5.5)
    card('<h1>ThatC Life changes <em>how</em><br>it helps you</h1><p>A guide that watches your time and progress on its own —<br>and adapts by voice on Alexa+, with a live companion screen.</p>'); wait(6)
    card(None); wait(.6)
    cap('THE IDEA','Say the task once. It does the rest.','Alexa+ talks to a self-hosted MCP server. The guide notices changes on its own, and a live companion screen reshapes itself.','#18d6b4'); wait(4.5)

    nxt('1 · ANY TASK, ANY TIME  →  EXPLORE','"I need to finish an investor presentation in two hours."','Information sized to your time: with two hours you get depth — real, specific points for the step in front of you.','#7c5cff')
    say('Alexa, I need to finish an investor presentation in two hours'); wait(10)
    nxt('2 · PROGRESS','"I finished the outline."','Every change has its own sound.','#7c5cff')
    say('I finished the outline'); wait(5.5)
    cap('3 · NOBODY SAYS A WORD','25 minutes pass. You do nothing.','It notices on its own — it chimes, shows what changed and asks what is wrong. No "I\'m falling behind" needed.','#ffb020')
    wait(1.2); adv(25); wait(7.5)
    nxt('4 · NO BLAME','"I got interrupted for twenty minutes."','Interruptions are excluded from your pace. Slow is not failing.','#ffb020')
    say('I got interrupted for twenty minutes'); wait(6)
    nxt('5 · THE STEP IS HARD','"This is too hard."','It splits the step into a smaller one instead of pushing harder.','#ffb020')
    say('This is too hard'); wait(5.5)
    nxt('6 · THE DEADLINE MOVES  →  SPRINT','"I only have 25 minutes now."','Less time, less information: the screen collapses to one instruction and the single most important fact.','#ff3d5a')
    say('I only have 25 minutes left'); wait(10)
    cap('7 · AND IT KEEPS WATCHING','Another stretch of time passes…','Time-box reached? Halfway? Ten minutes left? It tells you before you have to ask.','#ff3d5a')
    adv(14); wait(7.5)
    nxt('8 · PLANS CHANGE','"Actually, change my goal to a two minute elevator pitch."','Re-planned around what you already finished. Nothing wasted.','#18d6b4')
    say('Actually, change my goal to a two minute elevator pitch'); wait(7.5)
    cap('9 · FINISH  →  ALARM','"I finished that step."  ×  until done','A celebration chime and alarm when everything is complete.','#4ade80')
    for i in range(9):
        if mode()=='done': break
        say('I finished that step'); wait(3.2)
    wait(5.5)
    nxt('10 · ANY TASK','"I want to learn five guitar chords in 30 minutes."','Cooking, packing, studying, workouts, coding… It adapts to whatever you throw at it. Add an Amazon Bedrock key and every plan is tailored by AI.','#7c5cff')
    say('I want to learn five guitar chords in 30 minutes'); wait(8)
    cap('UNDER THE HOOD','Self-hosted MCP server · Streamable HTTP','Spec 2025-11-25. Every voice request is a real JSON-RPC tool call: start_session · get_guidance · get_briefing · complete_step · report_blocker · update_time · change_goal.','#4ac0ff'); wait(8)
    card('<h1>Why people <em>need</em> this</h1><ul><li>Students 3 hours before an exam</li><li>Pros whose deadline just moved up</li><li>Parents racing to get out the door</li><li>Workouts cut short by a busy day</li></ul><p>Time-aware · progress-aware · never judgemental.</p>'); wait(8)
    card('<h1>Time changes.<br>So does<br><em>your plan.</em></h1><p>ThatC Life · Alexa+ · self-hosted MCP server</p>'); wait(6)
    total=time.time()-vt0[0]; log('END')
    vp=pg.video.path(); ctx.close(); br.close()
stop=True

# ---- soundtrack: same notes the TV plays (tv/sounds.json), placed at the moments each notice fired ----
SR=44100; defs=json.load(open(os.path.join(HERE,'..','tv','sounds.json')))
dur=int((total+1)*SR); mix=np.zeros(dur,dtype=np.float32)
def render(name):
    notes=defs[name]; length=int((max(n['t']+n['d'] for n in notes)+.1)*SR); buf=np.zeros(length,dtype=np.float32)
    for n in notes:
        s=int(n['t']*SR); L=int(n['d']*SR); tt=np.arange(L)/SR
        f=n['f']*(n['to']/n['f'])**(tt/n['d']) if n.get('to') else np.full(L,n['f'])
        ph=2*np.pi*np.cumsum(f)/SR; w=n.get('w','sine')
        y=np.sin(ph) if w=='sine' else np.sign(np.sin(ph)) if w=='square' else 2/np.pi*np.arcsin(np.sin(ph)) if w=='triangle' else 2*((ph/(2*np.pi))%1)-1
        env=np.exp(np.linspace(np.log(1e-4),0,int(.012*SR)).tolist()+np.linspace(0,np.log(1e-4),max(1,L-int(.012*SR))).tolist()) if False else None
        a=int(.012*SR); e=np.concatenate([np.linspace(0,1,a),np.exp(np.linspace(0,np.log(1e-4),max(1,L-a)))])[:L]
        buf[s:s+L]+=(y*e*n.get('g',.25)).astype(np.float32)[:max(0,length-s)]
    return buf
for t,snd,kind,src in events:
    if snd not in defs: continue
    b=render(snd); i=max(0,int(t*SR)); mix[i:i+len(b)]+=b[:max(0,dur-i)]
mix=np.tanh(mix*1.4)*.85
wav=os.path.join(OUT,'sfx.wav')
with wave.open(wav,'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype(np.int16).tobytes())
mp4=os.path.join(OUT,'ThatC-Life-demo.mp4')
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',vp,'-i',wav,'-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-shortest','-movflags','+faststart',mp4],check=True)
print('sound events:',[(round(t,1),s) for t,s,k,_ in events]); print('video',mp4)
