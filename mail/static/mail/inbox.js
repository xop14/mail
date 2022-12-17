const errorMessage = document.createElement('div');

document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', () => compose_email(null));

  // By default, load the inbox
  load_mailbox('inbox');

});

function compose_email(email) {

  // Create views
  const emailsView = document.querySelector('#emails-view');
  const readView = document.querySelector('#read-view');
  const composeView = document.querySelector('#compose-view');

  // Reset error message
  errorMessage.remove();

  // Show compose view and hide other views
  emailsView.style.display = 'none';
  readView.style.display = 'none';
  composeView.style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';

  // POST content of form to /emails
  const form = document.querySelector('form');

  // Pre-fill input fields if email passed in
  if (email !== null) {
    form[1].value = email.sender;
    if (email.subject.slice(0,3) !== "Re:") {
      form[2].value = `Re: ${email.subject}`;
    } else {
      form[2].value = `${email.subject}`;
    }
    form[3].value = `\n\nOn ${email.timestamp} ${email.sender} wrote:\n${email.body}`;
  }

  form.onsubmit = () => {
    fetch('/emails', {
      method: 'POST',
      body: JSON.stringify({
        recipients: form[1].value,
        subject: form[2].value,
        body: form[3].value
      })
    })
    .then(response => response.json())
    .then(result => {
      if (result.error) {
        errorMessage.remove();
        errorMessage.innerHTML = `<div class="alert alert-warning" role="alert">${result.error}</div>`;
        form.prepend(errorMessage)
      } else {
        load_mailbox('sent');
      }
    })
    return false;
  };

}



function load_mailbox(mailbox) {

  // Create views
  const emailsView = document.querySelector('#emails-view');
  const readView = document.querySelector('#read-view');
  const composeView = document.querySelector('#compose-view');
  
  // Show the mailbox and hide other views
  emailsView.style.display = 'block';
  readView.style.display = 'none';
  composeView.style.display = 'none';

  // Get current users email address
  const userEmail = document.querySelector(".form-control").value;

  // Show the mailbox name
  emailsView.innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Get the mailbox content

  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
    emails.forEach(email => {
      const emailCard = document.createElement('div');
      emailCard.className = 'email-card';
      if (email.read === false) {
        emailCard.classList.add('unread')
      }
      emailCard.innerHTML = `
        <div class="card-read-status">${email.read === true ? '' : '●'}</div>
        <div class="card-sender">${email.sender === userEmail ? 'To: ' : 'From: '} ${email.sender === userEmail ? email.recipients : email.sender}</div>
        <div class="card-subject">Subject: ${email.subject}</div>
        <div class="card-timestamp">${email.timestamp}</div>
        `;
      emailCard.addEventListener('click', () => readEmail(email.id))
      emailsView.append(emailCard);
    });
  });
}


function readEmail(emailId) {
  
  // Create views
  const emailsView = document.querySelector('#emails-view');
  const readView = document.querySelector('#read-view');
  const composeView = document.querySelector('#compose-view');

  // Show compose view and hide other views
  emailsView.style.display = 'none';
  readView.style.display = 'block';
  composeView.style.display = 'none';

  // Get current users email address
  const userEmail = document.querySelector(".form-control").value;

  // Reset read view
  readView.innerHTML = '';

  // Get the email's content
  fetch(`/emails/${emailId}`)
  .then(response => response.json())
  .then(email => {
    const emailContainer = document.createElement('div');
    emailContainer.className = 'email-container';
    emailContainer.innerHTML = `
      <div class="email-header">
        <div class="email-sender"><strong>From:</strong> ${email.sender} ${email.sender === userEmail ? '(Me)' : ''}</div>
        <div class="email-timestamp">${email.timestamp}</div>
        <div class="email-tag">${email.archived === true ? 'Archived' : email.sender === userEmail ? 'Sent' : 'Inbox'}</div>
      </div>
      <div class="email-recipients"><strong>To:</strong> ${email.recipients}</div>
      <div class="email-subject"><strong>Subject:</strong> ${email.subject}</div>
      <div class=email-message-bar>
        <div><strong>Message:</strong></div>
        <div class="archive-button" title="${email.archived === true ? 'Unarchive this email' : 'Archive this email'}">
          <svg style="width:24px;height:24px" viewBox="0 0 24 24">
            ${email.archived === true ? 
              '<path fill="currentColor" d="M21 7H3V3H21V7M13 19C13 19.7 13.13 20.37 13.35 21H4V8H20V13.09C19.67 13.04 19.34 13 19 13C15.69 13 13 15.69 13 19M15 13V11.5C15 11.22 14.78 11 14.5 11H9.5C9.22 11 9 11.22 9 11.5V13H15M22.54 16.88L21.12 15.47L19 17.59L16.88 15.47L15.47 16.88L17.59 19L15.47 21.12L16.88 22.54L19 20.41L21.12 22.54L22.54 21.12L20.41 19L22.54 16.88Z" />' : 
              '<path fill="currentColor" d="M3,3H21V7H3V3M4,8H20V21H4V8M9.5,11A0.5,0.5 0 0,0 9,11.5V13H15V11.5A0.5,0.5 0 0,0 14.5,11H9.5Z" />'
            }
          </svg>
        </div>
      </div>
      <div class="email-body">${email.body}</div>
      `;
    readView.append(emailContainer);

    // Add archive button functionality
    const archiveBtn = document.querySelector(".archive-button");

    // hide archive button if sent email
    if (email.sender === userEmail) {
      archiveBtn.style.display = 'none';
    }

    archiveBtn.addEventListener('click', () => {
      if (email.archived === false) {
        // Mark as archived and then go to inbox
        fetch(`/emails/${emailId}`, {
          method: 'PUT',
          body: JSON.stringify({
              archived: true
          })
        })
        .then(() => {
          load_mailbox('inbox');
        });
      } else {
        // Mark as unarchived
        fetch(`/emails/${emailId}`, {
          method: 'PUT',
          body: JSON.stringify({
              archived: false
          })
        })
        .then(() => {
          load_mailbox('inbox');
        });
      }
    });

    // Mark as read
    fetch(`/emails/${emailId}`, {
      method: 'PUT',
      body: JSON.stringify({
          read: true
      })
    })

    // Add reply button if in inbox
    if (email.archived === false && email.sender !== userEmail) {
      const replyBtn = document.createElement('button');
      replyBtn.className = 'email-reply-btn btn btn-primary';
      replyBtn.innerHTML = 'Reply';
      readView.append(replyBtn);
      replyBtn.addEventListener('click', () => {
        compose_email(email);
      });
    }
  });

}
