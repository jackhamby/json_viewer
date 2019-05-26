let g_json = null;

    class Tree {
        constructor(dom_id, json){
            this.json = json;
            this.dom_id = dom_id;
            this.nodes = this.create_nodes(json);
        }

        create_nodes(json){
            let nodes = []
            if (Array.isArray(json)){
                for (let i in json){
                    nodes.push(Node.create_node(i, json[i], null, false, true))
                }
            }
            else if(typeof(json) == "object"){
                for (let key in json) {
                    nodes.push(Node.create_node(key, json[key], null, false, false))
                }
            }
            return nodes
        }

        to_jstree(){
            let context = this;
            let tree_data = {
                "core" : {
                    "data": [
                        {
                            "id" : "root",
                            "text": "json",
                            "children" : this.nodes.map(node => node.to_jstree()),
                            "type" : Array.isArray(this.json) ? "array" : "object"
                        }
                    ],
                    "check_callback" : true
                },
                "types" : {
                    "object" : {
                        "icon" : "../static/images/object.gif"
                    },
                    "array" : {
                        "icon" : "../static/images/array.gif"
                    }, 
                    "int" : {
                        "icon" : "../static/images/int.png"
                    },
                    "bool" : {
                        "icon" : "../static/images/bool.png"
                    },
                    "null" : {
                        "icon" : "../static/images/null.png"
                    },
                    "string" : {
                        "icon" : "../static/images/string.png"
                    }
                },
                "contextmenu" : {
                    "items" : function(node){  
                        return context.create_context_menu(node);                   
                    }
                },
                "plugins" : ["types", "contextmenu"]
            }
            return tree_data
        }

        create_context_menu(jstree_node){
            let context = this;
            let node = this.get_node(jstree_node.id);
            console.log(node)

            if (!node){
                return {
                    "copy" : {
                        "label" : "copy",
                        "action" : function(event){
                            copy_to_clipboard(g_json);
                        }                 
                    }
                }
            }
            else if (node.parent === null || node.parent instanceof(ArrayNode)){
                return {
                    "copy" : {
                        "label" : "copy",
                        "action" : function(event){
                            copy_to_clipboard(node.value);
                        }                 
                    }
                }
            }
            else{
                return {
                    "copy_key" : {
                        "label" : "copy key",
                        "action" : function(event){
                            copy_to_clipboard(node.key);

                        }                 
                    },
                    "copy_value" : {
                        "label" : "copy value",
                        "action" : function(event){
                            copy_to_clipboard(node.value);
                        }                 
                    },
                    "copy_key_and_value" : {
                        "label" : "copy key and value",
                        "action" : function(event){
                            copy_to_clipboard(`${JSON.stringify(node.key)} : ${JSON.stringify(node.value)}`);
                        }  
                    }
                }
            }
        }

        render(){
            $(`#${this.dom_id}`).jstree('destroy');
            $(`#${this.dom_id}`).jstree(this.to_jstree());
        }


        get_node(id){
            let split_id = id.split('.');
            for (let i in this.nodes){
                let node = this.nodes[i]
                if (node.path == split_id[0]){
                    split_id.splice(0, 1);
                    if (split_id.length == 0){
                        return node;
                    }
                    return node.get_child(split_id, 1);
                }
            }
            return null;
        }


        handle(){
            let context = this;
            $(`#${this.dom_id}`).on("select_node.jstree", function (event, data) { 
                let node = context.get_node(data.node.id);
                if (!node){
                    render_json_detail(g_json);
                }
                else if (node.children.length > 0){
                    render_json_detail(node.value)
                }
                else if (node.parent){
                    render_json_detail(node.parent.value);
                }
                else {
                    render_json_detail(g_json);
                }
            });
        }


    }


    class Node {
        constructor(key, value, path, parent){
            this.key = key;
            this.value = value;
            this.children = [];
            this.path = path;
            this.parent = parent;
        }



        to_json(){
            // override this
        }

        to_jstree() {
            // override this
        }

        get_children(current_path, is_array=false){
            let children = [];
            for (let i in this.value){
                children.push(Node.create_node(i, this.value[i], this, current_path, is_array));
            }
            return children;
        }

        get_child(child_path, index){
            for (let i in this.children){
                let child_node = this.children[i];
                let split_child_path = child_node.path.split('.');
                if (split_child_path[index] == child_path[0]){
                    child_path.splice(0, 1);
                    if (child_path.length == 0){
                        return child_node;
                    }
                    return child_node.get_child(child_path, index + 1)
                }
            }
        }

        static create_node(key, value, parent, current_path, is_array_child){
            let node;
            let path_key = is_array_child ? `[${key}]` : key;
            if (Array.isArray(value)){
                current_path = current_path ? `${current_path}.${path_key}` : path_key;
                node = new ArrayNode(key, value, current_path, parent);
            }
            else if (typeof(value) == "object" && !(value === null)){
                current_path = current_path ? `${current_path}.${path_key}` : path_key;
                node = new ObjectNode(key, value, current_path, parent);
            }
            else{
                current_path = current_path ? `${current_path}.${path_key}` : path_key;
                node = new LeafNode(key, value, current_path, parent);
            }
            return node;
        }

    }



    class ArrayNode extends Node {

        constructor(key, value, path, parent){
            super(key, value, path, parent);
            this.children = this.get_children(path, true);
            
        }

        to_jstree(){
            let jstree_node = {
                "text" : this.key,
                "type" : "array",
                "id" : this.path,
                "children" : this.children.map(child => child.to_jstree())
            }
            return jstree_node;
        }
    }

    class ObjectNode extends Node {
        constructor(key, value, path, parent){
            super(key, value, path, parent);
            this.children = this.get_children(path, false);
        }

        to_jstree(){
            let jstree_node = {
                "text" : this.key,
                "type" : "object",
                "id" : this.path,
                "children" : this.children.map(child => child.to_jstree())
            }
            return jstree_node;
        }
    }

    class LeafNode extends Node {
        constructor(key, value, path, parent){
            super(key, value, path, parent);
        }

        to_jstree(){
            let jstree_node = {
                "text" : `${this.key} : ${this.value}`,
                "type" : this.get_type(),
                "id" : this.path
            }
            return jstree_node;
        }

        get_type(){
            switch (typeof(this.value)){
                case "string":
                    return "string";
                case "boolean":
                    return "bool"
                case "number":
                    return "int"
                case "object":
                    return "null";
                default:
                    return "string";
            }
        }
    }


    render_json_detail = function(json){
        $('#detail-container').empty();
        let table = $(`<table class='table'></table>`);
        for (let i in json){
            let value = json[i]
            if (Array.isArray(json[i])){
                value = "...";
            }
            else if (typeof(json[i]) == "object"){
                value = "...";
            }
            let row = $(`<tr>
                         <td>${i}</td>
                         <td>${value}</td>
                       </tr>`);
            table.append(row);
        }   
        $('#detail-container').append(table);



    }

    copy_to_clipboard = function(json){
        let off_page_dom = $(`<textarea id="copy-text-container" class="copy-text-area" ></textarea>`);
        $('body').append(off_page_dom);
        if (typeof(json) == "object"){
            json = JSON.stringify(json)
        }
        $('#copy-text-container').val(json);
        $('#copy-text-container').text(json);
        $('#copy-text-container').select();
        document.execCommand('copy');
        $('#copy-text-container').remove();
    }

    parse_json = function(json_string){
        let json;
        try {
            json = JSON.parse(json_string);
        }
        catch {
            window.alert("invalid json variable!");
            $('#text').click();
            return false;
        }
        return json;
    }

    $('#format').on('click', function(event){
        if (!$('#text').hasClass("active")){
            return
        }
        else {
            let json_string = $('textarea').val();
            if (parse_json(json_string)){
                let formatted_json = JSON.stringify(JSON.parse(json_string), null, 4)
                $('textarea').val(formatted_json);
            }
        }
    })


    $('textarea').on('click', function(event){
        if (event.target.value == "copy your json here!"){
            $(event.target).text("");
        }
    })

    $('.nav-link').on('click', function(event){
        $('.nav-link').removeClass("active");
        if (!$(this).hasClass("active")){
            $(this).addClass("active");
        }
    })

    $('#text').on('click', function(event){
        $('#jsondump').show();
        $('#tree').hide();
    })

    $('#viewer').on('click', function(event){
        let json;
        $('#jsondump').hide();
        $('#tree').show();
        let json_string = $('textarea').val();
        json = parse_json(json_string);
        if (json){
            g_json = json;
            let tree = new Tree('tree', json);
            tree.render();
            tree.handle();
        }
    })

