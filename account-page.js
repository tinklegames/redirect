(() => {
 const $=id=>document.getElementById(id);
 $('replace-code').onclick=async()=>{
  if(!confirm('Replace your recovery code? The old code will stop working.'))return;
  $('replace-code').disabled=true;
  try{const recovery=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');const result=await TinkleAccount.mutate('rotateRecovery',{recovery,currentCode:$('current-recovery').value});$('current-recovery').value='';$('replacement-value').textContent=result.recoveryCode;$('replacement-code').hidden=false;$('account-status').textContent=result.message;}
  catch(error){$('account-status').textContent=error.message;}finally{$('replace-code').disabled=false;}
 };
 $('replacement-download').onclick=()=>{const url=URL.createObjectURL(new Blob([`Tinkle account: ${TinkleAccount.profile.username}\nRecovery code: ${$('replacement-value').textContent}\nKeep this private.\n`],{type:'text/plain'}));const link=document.createElement('a');link.href=url;link.download='tinkle-recovery-code.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('restore-account').onclick=()=>TinkleAccount.showRecovery();
})();
