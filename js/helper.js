let allowedFileTypes = ['ai','pdf','doc','docx','csv','ppt','pptx','pps','ppsx','odt','rtf','xls','xlsx','txt']
let allowedImageTypes = ['png','jpg','jpeg']

const helper = {
    toJson(str) {
        if(str) return JSON.parse(str);
    },
    truncateString(str, len) {
        if (str) {
          if (str.length <= len) {
            return str;
          }
          return str.slice(0, len) + "...";
        }
        return str;
    },
    async handleFileUpload(ev, elemId, type) {
        let fileUrl = ''
        let file = ev.target.files[0]
        let extension = file.type.split('/')[1]

        if (type === 'image' && allowedImageTypes.includes(extension) === false) {
            ev.target.value = null;
            return;
        } else if(type === 'file' && allowedFileTypes.includes(extension) === false) {
            ev.target.value = null;
            return;
        }

        let files = [...ev.target.files];
        fileUrl = await Promise.all(files.map(f=>{return this.readAsDataURL(f)}));
        return fileUrl
    },
    readAsDataURL(file) {
		return new Promise((resolve, reject)=>{
			let fileReader = new FileReader();
			fileReader.onload = function(){
				return resolve({data:fileReader.result, name:file.name, size: file.size, type: file.type});
			}
			fileReader.readAsBinaryString(file);
		})
    },
    setAIContentToDropdown(fieldId) {
        $(`#${fieldId}`).empty();

        $('<option/>', {
            value: '',
            html: 'Select content'
        }).appendTo(`#${fieldId}`);

        for(const [i, v] of aicontents.entries()) {
            $('<option/>', {
                value: aicontents[i].contents,
                html: aicontents[i].title
            }).appendTo(`#${fieldId}`);
        }
    },
    transformText(text, type){
        if(type == 'capitalize'){
            text = text.charAt(0).toUpperCase() + text.slice(1);
        }
        return text;
    }
    
}