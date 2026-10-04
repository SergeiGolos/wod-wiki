import { chromium } from 'playwright';
const errors=[];
const b=await chromium.launch();
const pg=await b.newPage({viewport:{width:1280,height:900}});
pg.on('pageerror',e=>errors.push('PAGEERROR: '+e.message));
pg.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE: '+m.text())});
await pg.goto('file:///home/serge/Projects/wod-wiki/tour-redesign.prototype.html');
await pg.waitForTimeout(400);
const R={};
R.runPills=await pg.locator('.variant.active [data-act="run"]').count();
R.refusalHidden=await pg.locator('.variant.active [data-v="refusal"]').first().isHidden();
// editor free-text edit flows downstream
await pg.locator('.variant.active [data-note]').first().fill('# Edit Me\n\n```time\n(4)\n  12 Kettlebell Swings 32kg\n  *:45 Rest\n```');
await pg.waitForTimeout(200);
R.editParsed=await pg.evaluate(()=>S.parsed);
// Run → overlay
await pg.locator('.variant.active [data-act="run"]').first().click();
await pg.waitForTimeout(200);
R.overlayOn=await pg.locator('#toverlay.on').count();
R.readyLab=await pg.locator('#toverlay [data-v="tlab"]').textContent();
await pg.locator('#toverlay .circ.prim').click();
await pg.waitForTimeout(700);
await pg.locator('#toverlay [data-tact="next"]').first().click(); // lock work split → rest
await pg.waitForTimeout(300);
R.restChip=await pg.locator('#toverlay [data-v="restchip"]').isVisible();
await pg.locator('#toverlay [data-tact="next"]').first().click(); // refuse during required rest
await pg.waitForTimeout(200);
R.flash=await pg.locator('#toverlay [data-v="tflash"]').isVisible();
await pg.locator('#toverlay .circ.prim').click(); // pause
await pg.waitForTimeout(200);
R.nextDisabledWhenPaused=await pg.locator('#toverlay .circ.next').isDisabled();
R.stopEnabled=await pg.locator('#toverlay .circ.stop').isEnabled();
await pg.locator('#toverlay .circ.prim').click(); // resume
await pg.waitForTimeout(200);
await pg.locator('#toverlay .circ.stop').click(); // stop → review
await pg.waitForTimeout(400);
R.overlayClosed=await pg.locator('#toverlay.on').count()===0;
R.reviewRows=await pg.locator('.variant.active [data-row]').count();
await pg.locator('.variant.active [data-row]').first().click();
R.selFoot=await pg.locator('.variant.active [data-v="rgselft"]').first().textContent();
await pg.locator('.variant.active [data-mcard="rest"]').first().click();
R.gridHl=await pg.locator('.variant.active tr.hl').count();
// search filter
await pg.locator('.variant.active [data-rgsearch]').fill('Rest');
await pg.waitForTimeout(150);
R.filtered=await pg.locator('.variant.active [data-v="rgcount"]').first().textContent();
await pg.locator('.variant.active [data-rgsearch]').fill('');
// query invalid preserved + refusal
await pg.locator('.variant.active [data-qraw]').fill('bogus query');
await pg.waitForTimeout(150);
R.qDiagErr=(await pg.locator('.variant.active [data-v="qdiag"]').first().textContent()).slice(0,40);
R.qRawPreserved=await pg.locator('.variant.active [data-qraw]').inputValue();
await pg.locator('.variant.active [data-qraw]').fill('sum:totalReps{} by {effort} last 6w');
await pg.waitForTimeout(150);
R.qOk=await pg.locator('.variant.active [data-v="qout"] .tbl').count();
// add condition
await pg.locator('.variant.active [data-addcond]').first().click();
await pg.locator('.variant.active [data-cond="discipline"]').first().click();
await pg.waitForTimeout(150);
R.condAdded=await pg.locator('.variant.active [data-qraw]').inputValue();
// board
R.promptCard=await pg.locator('.variant.active [data-act="sampleon"]').count();
await pg.locator('.variant.active [data-act="sampleon"]').first().click();
await pg.waitForTimeout(250);
R.widgets=await pg.locator('.variant.active [data-wid]').count();
R.sampleVals=await pg.locator('.variant.active [data-wid] .wval').count();
await pg.locator('.variant.active [data-act="clone"]').first().click();
await pg.waitForTimeout(200);
R.editToggle=await pg.locator('.variant.active [data-act="editdone"]').isVisible();
R.bannerGone=await pg.locator('.variant.active [data-act="clone"]').count()===0;
await pg.locator('.variant.active [data-act="editdone"]').click();
R.addWidget=await pg.locator('.variant.active [data-addwidget]').isVisible();
R.wtoolbars=await pg.locator('.variant.active .wtl').count();
await pg.locator('.variant.active [data-addwidget]').click();
await pg.waitForTimeout(500);
R.composerOpen=await pg.evaluate(()=>document.getElementById('composerdlg').open);
R.applyEnabled=await pg.locator('#capply').isEnabled();
await pg.locator('#capply').click();
await pg.waitForTimeout(200);
R.widgetsAfterAdd=await pg.locator('.variant.active [data-wid]').count();
await pg.locator('.variant.active [data-range="4w"]').first().click();
await pg.locator('.variant.active [data-unit="lb"]').first().click();
await pg.waitForTimeout(200);
R.unitLb=await pg.locator('.variant.active [data-unit="lb"]').first().getAttribute('class');
// inspect (prebuilt path check on fresh reload later)
await pg.locator('.variant.active [data-eye]').first().click();
await pg.waitForTimeout(200);
R.inspectOpen=await pg.evaluate(()=>document.getElementById('inspectdlg').open);
R.inspectTitle=await pg.locator('#ins-title').textContent();
await pg.keyboard.press('Escape');
// unsupported preset refusal
await pg.locator('.variant.active [data-preset]').selectOption('2');
await pg.waitForTimeout(250);
R.presetRefusal=await pg.locator('.variant.active [data-v="refusal"]').first().isVisible();
R.notePreserved=(await pg.locator('.variant.active [data-note]').first().inputValue()).includes('5:00 Run 400m');
// variants
await pg.locator('[data-var="B"]').click();await pg.waitForTimeout(300);
R.B=await pg.locator('#variant-B.active [data-c="timer"]').count()===1&&await pg.locator('#variant-B.active [data-c="board"]').count()===1;
await pg.locator('#variant-B [data-stage="query"]').click();await pg.waitForTimeout(200);
R.Bquery=await pg.locator('#variant-B.active [data-qraw]').count();
await pg.locator('[data-var="C"]').click();await pg.waitForTimeout(300);
R.C=await pg.locator('#variant-C.active [data-c="board"]').count()===1&&await pg.locator('#variant-C.active .mnote').count();
// mobile + dark
await pg.setViewportSize({width:390,height:844});
await pg.waitForTimeout(300);
R.mobileRail=await pg.locator('.rail').first().isVisible();
await pg.locator('#theme-btn2').click();await pg.waitForTimeout(150);
R.dark=await pg.evaluate(()=>document.documentElement.classList.contains('dark'));
console.log(JSON.stringify(R,null,1));
console.log('ERRORS:',JSON.stringify(errors));
await b.close();
