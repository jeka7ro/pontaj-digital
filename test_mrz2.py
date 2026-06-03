import re

mrz_text = "RK192171<2ROU8011026M281102814301267"
mrz_text = mrz_text.replace(' ', '').replace('O', '0').replace('o', '0').replace('I', '1').replace('l', '1')

mrz_pattern = re.search(r'ROU(\d{6})\d[MF<](\d{6})\d([12568]\d{6})', mrz_text, re.IGNORECASE)
if mrz_pattern:
    print("MATCHED!")
else:
    print("FAILED TO MATCH!")

mrz_pattern2 = re.search(r'R0U(\d{6})\d[MF<](\d{6})\d([12568]\d{6})', mrz_text, re.IGNORECASE)
if mrz_pattern2:
    print("MATCHED WITH R0U!")
