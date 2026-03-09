import tree_sitter_python as tspython
from tree_sitter import Language, Parser
import re

# Initialize the Python language from the tree-sitter-python package
PY_LANGUAGE = Language(tspython.language())

# Initialize the parser
# Note: For tree-sitter >= 0.22, you can initialize the Parser directly with the language.
# For older versions, you might use parser = Parser() followed by parser.set_language(PY_LANGUAGE)
try:
    parser = Parser(PY_LANGUAGE)
except TypeError:
    parser = Parser()
    parser.set_language(PY_LANGUAGE)

def parse_code_to_ast(code: str):
    """
    Parses the raw Python code string and returns the root node of the AST.
    """
    tree = parser.parse(bytes(code, "utf8"))
    return tree.root_node

def extract_conflict_blocks(raw_conflict_text: str) -> dict:
    """
    Extracts the developer A (HEAD) and developer B code from git conflict markers.
    Returns a dictionary with keys 'dev_a_code' and 'dev_b_code'.
    """
    raw_conflict_text = raw_conflict_text.replace('\r\n', '\n')
    pattern = re.compile(r'<<<<<<<.*?\n(.*?)=======\n(.*?)>>>>>>>', re.DOTALL)
    match = pattern.search(raw_conflict_text)
    
    dev_a = ""
    dev_b = ""
    
    if match:
        dev_a = match.group(1)
        if dev_a.endswith('\n'):
            dev_a = dev_a[:-1]
            
        dev_b = match.group(2)
        if dev_b.endswith('\n'):
            dev_b = dev_b[:-1]
            
    return {
        "dev_a_code": dev_a,
        "dev_b_code": dev_b
    }
