import {ReactComponent as Arrow} from './arrow.svg';
import './App.css';
import React, {useState, useEffect} from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { a11yDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

/* eslint-disable no-useless-escape */
/* eslint-disable react-hooks/exhaustive-deps */

const fetch_get = {
  method: "GET",
  mode: "cors",
  credentials: "include",
};

let conversation_id = "";

const FormatResponse = ({ input_text }) => {
  if (!input_text) return null;
  
  let lines;
  if (Array.isArray(input_text)) {
    let temp = [];
    input_text.forEach((item) => {
      if (item.type === "text") {
        temp.push(item.text);
      }
      else if (item.type === "image_url") {
        temp.push(item.image_url.url);
      }
    });
    lines = temp;
  }
  else {lines = input_text.split("\n");}
  const codeBlockPattern = /^\s*```(.*)$/;
  const unorderListPattern = /^[\-*]\s+(.*)$/;
  const orderListPattern = /^\d\.\s+(.*)$/;
  const base64Pattern = /^data:image\/[a-zA-Z]*;base64,/;
  let formattedElements = [];
  let listItems = [];
  let nomralItems = [];
  let codeLines = [];
  let lastMatched = [];
  
  const flushNormalItems = () => {
    if (nomralItems.length) {
      if (nomralItems[0].trim() === "") { nomralItems.shift(); }
      if (nomralItems.length === 0) { return; }
      nomralItems[0] = nomralItems[0].trimStart();
      formattedElements.push(
        <MathJax key={formattedElements.length} dynamic>
          {nomralItems.join("\n")}
        </MathJax>
      );
      nomralItems = [];
    }
  }

  const flushCodeItems = () => {
    flushNormalItems();
    if (codeLines.length) {
      lastMatched.pop();
      const tempResult = codeBlockPattern.exec(codeLines[0]);
      const language = tempResult ? tempResult[1] : "";
      const new_block = (
        <SyntaxHighlighter key={formattedElements.length} language={language} style={a11yDark} customStyle={{fontSize: "small", marginLeft: "auto", marginRight: "auto", width: "80%"}} wrapLongLines={true} >
          {codeLines.slice(1, codeLines.length-1).join("\n")}
        </SyntaxHighlighter>
      );
      if (lastMatched.length && (lastMatched[lastMatched.length - 1] === "ul" || lastMatched[lastMatched.length - 1] === "ol")) {
        listItems[listItems.length - 1] = (<>{listItems[listItems.length - 1]}{new_block}</>);
      }
      else {
        formattedElements.push(new_block);
      }
      codeLines = [];
    }
  }

  const flushListItems = () => {
    flushNormalItems();
    if (listItems.length) {
      if (lastMatched[lastMatched.length - 1] === "ul") {
        formattedElements.push(
          <ul key={formattedElements.length}>
            {listItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        );
      }
      else if (lastMatched[lastMatched.length - 1] === "ol") {
        formattedElements.push(
          <ol key={formattedElements.length}>
            {listItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ol>
        );
      }
      listItems = [];
      lastMatched.pop();
    }
  }

  lines.forEach((line, index) => {
    // If code block start is already found
    if (lastMatched[lastMatched.length - 1] === "code") {
      // If code block end found
      if (codeBlockPattern.test(line.trim())) {
        codeLines.push(line);
        flushCodeItems();
      }
      else {
        codeLines.push(line);
      }
      return;
    }
    // If start of code block found
    if (codeBlockPattern.test(line.trim())) {
      lastMatched.push("code");
      codeLines.push(line);
    }
    else if (unorderListPattern.test(line.trim())) {
      if (lastMatched[lastMatched.length - 1] !== "ul") {
        lastMatched.push("ul");
      }
      listItems.push(line.trim().replace(/^[\-*]\s+/, ""));
    }
    else if (orderListPattern.test(line.trim())) {
      if (lastMatched[lastMatched.length - 1] !== "ol") {
        lastMatched.push("ol");
      }
      listItems.push(line.trim().replace(/^\d\.\s+/, ""));
    }
    else if (base64Pattern.test(line.trim())) {
      formattedElements.push(
        <img key={formattedElements.length} src={line.trim()} alt="attachment" style={{maxWidth: "100%", maxHeight: "100%"}}/>
      );
    }
    else {
      if (line.trim() === "") { return; }
      if (lastMatched.length) { flushListItems(); }
      nomralItems.push(line);
    }
  })
  flushListItems();
  flushNormalItems();
  return formattedElements;
}

const MenuItem = ({setMessage, title, id, setReloadHistory}) => {
  function delete_click(e) {
    e.preventDefault();
    e.stopPropagation();
    let new_conversation_id = e.target.getAttribute("data-value");
    if (new_conversation_id === conversation_id) { 
      setMessage([]);
      conversation_id = "";
    }
    fetch(("http://127.0.0.1:8080/conversation/" + new_conversation_id), {
      method: "DELETE",
      mode: "cors",
      credentials: "include",
    }).then(()=>{ setReloadHistory(true); }).catch(err => {
      console.log("Failed to delete conversation");
      console.error(err);
    });
  }
  function click(e) {
    e.preventDefault();
    let new_conversation_id = e.target.getAttribute("data-value");
    if (new_conversation_id === conversation_id) { return; }
    conversation_id = new_conversation_id;
    fetch(("http://127.0.0.1:8080/conversation/" + new_conversation_id), fetch_get).then(res => {
      res.json().then(data => {
        setMessage(data.messages);
      });
    }).catch(err => {
      console.log("Failed to retrieve conversation");
      console.error(err);
    });
  }

  return (
    <div className="menu_item" onClick={click} data-value={id}>
      <span data-value={id}>{title}</span>
      <div className="menu_delete_button" onClick={delete_click} data-value={id}>
        <img className="hundred" src="recycle.svg" alt="recycle_button" title="Delete conversation" data-value={id}/>
      </div>
    </div>
  )
}

const LeftBar = ({setMessage, loginState, setLoginState, reloadHistory, setReloadHistory}) => {
  const [username, setUsername] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8080/username", fetch_get).then(res => {
      res.text().then(data => {
        if (data !== "") {
          setUsername(data);
          setLoginState(true);
        }
      });
    }).catch(err=>{
      console.log("Failed to retrieve username");
      console.error(err);
    });
  }, []);

  useEffect(()=>{
    if ( !loginState ) { return; }
    if ( history.length > 0 && !reloadHistory ) { return; }
    fetch("http://127.0.0.1:8080/history", fetch_get).then(res => {
      res.json().then(data => {
        setHistory(data);
      });
    }).catch(err=>{
      console.log("Failed to retrieve history");
      console.error(err);
    });
    if (reloadHistory) { setReloadHistory(false); }
  }, [loginState, reloadHistory]);

  const handleLogin = () => {
    window.location.href = "http://127.0.0.1:8080/oauth2/login";
  }

  const handleNewChat = (e) => {
    e.preventDefault();
    conversation_id = "";
    setMessage([]);
  }

  return (
    <div className="full_height flex flex_col Left_Menu">
      <div>
        <a href={window.location.origin} onClick={handleNewChat} className={"new_chat"} style={{display:'flex', height:"2.5rem"}}>
          <div style={{paddingRight: "5px"}}>
            <img className=" h2/3" src="chatgpt.svg" alt="logo"/>
          </div>
          New Chat
        </a>
      </div>
      <div className="hundred full_width content_menu">
        {history.map((item, index) => {
          return (
            <MenuItem key={index} setMessage={setMessage} title={item.title} id={item.id} setReloadHistory={setReloadHistory}/>
          )
        })}
      </div>
      <div className="flex_col flex account">
        {username ? <span>{username}</span>: <button onClick={handleLogin} type="button">Log in</button>}
      </div>
    </div>
    
  )
}

const BottomBarImage = ({image, index, attachment, setAttachment}) => {

  function imageClick(e) {
    const target_index = e.target.getAttribute("data-index");
    let new_attachment = [].concat(attachment);
    new_attachment.splice(target_index, 1);
    setAttachment(new_attachment);
  }
  
  return (
    <div className="msg_image_div">
      <img src={image} data-index={index} className="msg_image" alt="attachment"/>
      <div className="img_del_div">
        <img src="cross.svg" className="img_del" data-index={index} alt="close_button" title="Delete image" onClick={imageClick}/>
      </div>
    </div>
  )
}

const BottomBar = ({message, setMessage, setThinking, setReloadHistory}) => {
  const [question, setQuestion] = useState("");
  const [attachment, setAttachment] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let chatbox = document.getElementById("chatbox");
    chatbox.style.height = "0px";
    let padding_top = parseInt(window.getComputedStyle(chatbox, null).paddingTop);
    let padding_bottom = parseInt(window.getComputedStyle(chatbox, null).paddingBottom);
    let content_row = ~~((chatbox.scrollHeight - padding_top - padding_bottom) / parseInt(window.getComputedStyle(chatbox, null).lineHeight));
    let new_row;
    if (content_row < 4) {
      new_row = content_row;
      chatbox.style.scrollbarWidth = "none";
    }
    else {
      new_row = 4;
      chatbox.style.scrollbarWidth = "auto";
    }
    let new_height = new_row * parseInt(window.getComputedStyle(chatbox).lineHeight) +"px";
    chatbox.style.height = new_height;
  }, [question]);

  async function getConversationId() {
    let res = await fetch("http://127.0.0.1:8080/new_chat", fetch_get).catch(err => {console.log("Failed to create new chat"); console.error(err);})
    let data = await res.json();
    conversation_id = data.id;
  }

  function scaleImage(base64_img) {
    const max_long = 2000;
    const max_short = 768;
    let img = new Image();
    img.src = base64_img;
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");
    let width = img.width;
    let height = img.height;
    let new_width = width, new_height = height;
    if (width > height) {
      if (width > max_long) {
        new_width = max_long;
        new_height = height * max_long / width;
      }
      if (new_height > max_short) {
        new_height = max_short;
        new_width = width * max_short / height;
      }
    }
    else {
      if (height > max_long) {
        new_height = max_long;
        new_width = width * max_long / height;
      }
      if (new_width > max_short) {
        new_width = max_short;
        new_height = height * max_short / width;
      }
    }
    canvas.width = new_width;
    canvas.height = new_height;
    ctx.drawImage(img, 0, 0, new_width, new_height);
    console.log(`New height: ${new_height}, New width: ${new_width}`)
    return canvas.toDataURL();
  }

  async function submit(e) {
    if (e.type === "keydown" && !(e.key === "Enter" && !e.shiftKey)) { return; }
    if (uploading) { return; }
    e.preventDefault();
    if (question === "") { return; }
    let res_text = "";
    let old_id = conversation_id;
    let user_question = question;
    let old_message;
    let attachment_content= [];
    if (attachment.length) {
      attachment.forEach((item) => {
        attachment_content.push({type: "image_url", image_url: {url: scaleImage(item)}});
      })
      old_message = message.concat([{role: "user", content: [{type: "text", text: user_question}].concat(attachment_content)}]);
    }
    else {
      old_message = message.concat([{role: "user", content: [{type: "text", text: user_question}]}]);
    }
    setMessage(old_message);
    setQuestion("");
    setAttachment([]);
    if (conversation_id === "") {
      await getConversationId();
    }
    let res = await fetch("http://127.0.0.1:8080/api/request", {
      method: "POST",
      mode: "cors",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: old_message,
        chatId: conversation_id,
      })
    }).catch(err => {
      console.log("Failed to send message");
      console.error(err);
    })
    setThinking(true);
    for await (const chunk of res.body) {
      let partial = await new Response(chunk).text();
      res_text += partial;
      const new_message = old_message.concat([{role: "assistant", content: res_text}]);
      setMessage(new_message);
    }
    setThinking(false);
    if (old_id === "") { setReloadHistory(true); }
  }

  async function paste(e) {
    const image_regex = /^image\/.*/;
    const items = [].slice.call(e.clipboardData.items).filter(i=> image_regex.test(i.type));
    if (items.length === 0) { return; }
    const image = items[0].getAsFile();
    const reader = new FileReader();
    setUploading(true);
    reader.onloadend = function() {
      setAttachment(attachment.concat([reader.result]));
      setUploading(false);
    }
    reader.readAsDataURL(image);
  }

  return (
    <div className="flex flex_col submit_form_div">
      <div className="msg_image_left">
        {attachment.map((item, index) => {return (
              <BottomBarImage key={index} image={item} index={index} attachment={attachment} setAttachment={setAttachment}/>
            )
          })}
      </div>
      <form onSubmit={submit} className="submit_form flex">
        <textarea className="full_width chatbox" id="chatbox" name="chatbox" placeholder="Message ChatGPT" rows={1} onKeyDown={submit} onChange={(event => setQuestion(event.target.value))} onPaste={paste} value={question}/>
        <button type="submit" id="submit_but"><Arrow/></button>
      </form>
    </div>
  );
}

const MainContent = ({message, setMessage, setReloadHistory}) => {
  //const [message, setMessage] = useState([]);
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    let chatbox = document.getElementById("main_content");
    chatbox.scrollTop = chatbox.scrollHeight;
  }, [message]);

  return (
    <div className="Main_Content flex flex_col full_height full_width">
      <div className="">
        ChatGPT Clone
      </div>
      <div className="full_height full_width" id="main_content" style={{overflowY:"auto", marginBottom: "30px"}}>
        <div style={{maxWidth: "48rem"}} className="margin_auto">
          {message.map((item, index) => {
            return (
              <>
                {item.role === "user" ? <div className="username">You</div> : <div className="bot">ChatGPT</div>}              
                <div key={index} className={"flex flex_col chat_content fit_content" + (item.role === "user" ? " user_chat": "") }>
                  {FormatResponse({input_text: item.content})}
                  {(thinking && item.role === "assistant" && index === (message.length - 1)) ? <span className="blinking">•</span>: ""}
                </div>
              </>
            )
          })}
        </div>
      </div>
      <BottomBar message={message} setMessage={setMessage} setThinking={setThinking} setReloadHistory={setReloadHistory}/>
    </div>
  )
}

function App() {
  const [message, setMessage] = useState([]);
  const [loginState, setLoginState] = useState(false);
  const [reloadHistory, setReloadHistory] = useState(false);
  const mathJaxConfig = {
    options:{
      enableMenu: false,
    },
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="App full_height" style={{display:"flex"}}>
        <LeftBar setMessage={setMessage} loginState={loginState} setLoginState={setLoginState} reloadHistory={reloadHistory} setReloadHistory={setReloadHistory}/>
        <MainContent message={message} setMessage={setMessage} setReloadHistory={setReloadHistory}/>
      </div>
    </MathJaxContext>
  );
}

export default App;
