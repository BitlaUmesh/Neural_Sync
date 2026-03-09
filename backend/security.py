def scan_ast_for_threats(root_node):
    threat_list = [
        "os.remove",
        "os.system",
        "subprocess.run",
        "subprocess.Popen",
        "shutil.rmtree",
        "DROP TABLE"
    ]

    def traverse(node):
        if node and hasattr(node, "text") and node.text:
            try:
                # Tree-sitter text attribute usually returns bytes
                text = node.text.decode('utf-8') if isinstance(node.text, bytes) else str(node.text)
                for threat in threat_list:
                    if threat in text:
                        return {"is_safe": False, "threat_found": threat}
            except UnicodeDecodeError:
                pass
                
        if node and hasattr(node, "children"):
            for child in node.children:
                result = traverse(child)
                if not result["is_safe"]:
                    return result

        return {"is_safe": True, "threat_found": None}

    return traverse(root_node)
