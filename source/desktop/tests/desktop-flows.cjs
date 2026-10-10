const {chromium}=require('playwright');
const fs=require('fs');const path=require('path');fs.mkdirSync(path.resolve('../../work'),{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true}); const page=await browser.newPage({viewport:{width:1120,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__test={snapshot:null,cancelled:false,capture:null,response:null,calls:[],pending:[]};
  window.__RC_TEST_BRIDGE__=async(cmd,args)=>{
   window.__test.calls.push(cmd);
   if(cmd==='load_workspace')return null;if(cmd==='key_status')return !!window.__test.keySaved;
   if(cmd==='set_key'){window.__test.keySaved=true;return;}
   if(cmd==='save_workspace'){window.__test.snapshot=args.data;return;}
   if(cmd==='backup_workspace'){window.__test.backup=JSON.parse(JSON.stringify(args.data));return;}
   if(cmd==='choose_workspace_backup')return window.__test.backup;
   if(cmd==='list_models')return ['test/vision-model'];
   if(cmd==='capture')return window.__test.capture;
   if(cmd==='analyze'){if(window.__test.defer)return new Promise(resolve=>window.__test.pending.push(resolve));return JSON.stringify(window.__test.response);}
   if(cmd==='cancel_analysis'){window.__test.cancelled=true;return;}
   if(cmd==='copy_image'){if(!args.data.startsWith('data:image/png;base64,'))throw Error('Invalid copied PNG');return;}
   if(cmd==='export_file')return true;
  };
 });
 await page.goto('http://127.0.0.1:1420/');
 await page.getByRole('button',{name:'体验示例（不联网）',exact:true}).first().click();
 await page.getByRole('img',{name:/乙酸与乙醇有酯化路径的结构/}).waitFor();
 await page.getByRole('button',{name:'复制图',exact:true}).click();
 await page.locator('.toast').filter({hasText:'图片已复制，可粘贴到文档。'}).waitFor();
 const result=await page.evaluate(()=>window.__test.snapshot?.tasks[0]?.messages.at(-1)?.result);
 await page.waitForTimeout(500);
 const sample=await page.evaluate(()=>window.__test.snapshot.tasks[0].messages.at(-1).result);
 await page.evaluate(sample=>window.__test.response=sample,sample);
 // Esc / cancelled capture must not create a task.
 const count=await page.locator('nav[aria-label="分析历史"] button').count();
 await page.getByRole('button',{name:'截图分析',exact:true}).click();
 if(await page.locator('nav[aria-label="分析历史"] button').count()!==count)throw Error('Cancelled capture created task');
 await page.getByRole('button',{name:'新分析',exact:true}).first().click();
 await page.getByRole('textbox',{name:'输入问题',exact:true}).fill('未发送的草稿');
 await page.getByRole('button',{name:'新分析',exact:true}).first().click();
 await page.locator('nav[aria-label="分析历史"] button').nth(1).click();
 if(await page.getByRole('textbox',{name:'输入问题',exact:true}).inputValue()!=='未发送的草稿')throw Error('Draft lost');
 await page.getByRole('button',{name:'设置',exact:true}).click();
 await page.getByLabel(/API 密钥/).fill('integration-test-only-key');
 await page.getByRole('button',{name:'连接并获取模型',exact:true}).click();
 await page.getByRole('combobox',{name:'可用模型',exact:true}).selectOption('test/vision-model');
 await page.getByLabel('我已确认这个模型支持图片输入').check();
 await page.getByLabel(/已在平台核对：当前所选模型免费/).check();
 await page.getByLabel(/允许把我选中的图片/).check();
 await page.getByRole('button',{name:'保存设置',exact:true}).click();
 await page.getByRole('dialog',{name:'连接分析服务'}).waitFor({state:'hidden'});
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lD8AAAAASUVORK5CYII=','base64');
 await page.locator('input[type=file]').setInputFiles({name:'structure.png',mimeType:'image/png',buffer:png});
 const before=await page.evaluate(()=>window.__test.calls.filter(x=>x==='analyze').length);
 await page.waitForTimeout(500);
 if(await page.evaluate(()=>window.__test.calls.filter(x=>x==='analyze').length)!==before)throw Error('Upload auto submitted');
 const text=page.getByRole('textbox',{name:'输入问题',exact:true});
 await text.dispatchEvent('keydown',{key:'Enter',isComposing:true});
 if(await page.evaluate(()=>window.__test.calls.filter(x=>x==='analyze').length)!==before)throw Error('IME auto submitted');
 await text.press('Enter');await page.getByRole('img',{name:/乙酸与乙醇有酯化路径的结构/}).waitFor();
 await page.evaluate(data=>window.__test.capture=data,'data:image/png;base64,'+png.toString('base64'));
 await page.getByRole('button',{name:'截图分析',exact:true}).click();
 await page.getByRole('button',{name:'继续讨论',exact:true}).waitFor();
 await page.getByRole('img',{name:/乙酸与乙醇有酯化路径的结构/}).waitFor();
 await page.getByRole('button',{name:'继续讨论',exact:true}).click();
 if(await page.locator('.input-images img').count()!==1)throw Error('Capture context lost');
 // A late model reply must not resurrect a cancelled revision.
 await page.evaluate(()=>window.__test.defer=true);
 await page.getByRole('textbox',{name:'输入问题',exact:true}).fill('修改条件');
 await page.getByRole('button',{name:'发送',exact:true}).click();
 await page.getByRole('button',{name:'停止',exact:true}).click();
 await page.evaluate(()=>window.__test.pending[0](JSON.stringify(window.__test.response)));
 await page.waitForTimeout(500);
 if(await page.locator('.result').count()!==1)throw Error('Late reply resurrected');
 const leaked=await page.evaluate(()=>JSON.stringify(window.__test.snapshot).includes('integration-test-only-key'));if(leaked)throw Error('Key leaked into workspace');
 await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByText('本机历史与恢复',{exact:true}).click();
 await page.getByRole('button',{name:'备份并新建工作区',exact:true}).click();
 if(await page.locator('nav[aria-label="分析历史"] button').count())throw Error('New workspace not empty');
 await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByText('本机历史与恢复',{exact:true}).click();
 await page.getByRole('button',{name:'恢复本机备份',exact:true}).click();
 await page.getByRole('img',{name:/乙酸与乙醇有酯化路径的结构/}).last().waitFor();
 await page.screenshot({path:path.resolve('../../work/desktop-main.png'),fullPage:true});
 await page.getByRole('button',{name:'右侧面板',exact:true}).click();await page.setViewportSize({width:420,height:800});
 await page.screenshot({path:path.resolve('../../work/desktop-panel.png'),fullPage:true});
 const overflow=await page.locator('.app').evaluate(el=>el.scrollWidth>el.clientWidth+1);if(overflow)throw Error('Panel overflow');
 if(errors.length)throw Error(errors.join('\n'));
 fs.writeFileSync(path.resolve('../../work/desktop-flows.json'),JSON.stringify({passed:['real RDKit drawing','PNG conversion and copy request','cancel capture no new task','draft recovery','configuration','upload stages until send','IME Enter','capture auto analyzes','same task expands','late reply cancellation','credential absent from workspace','backup and restore history','420px panel'],runtimeErrors:errors},null,2));
 console.log('Desktop interaction tests passed');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
