import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  SafeAreaView, StatusBar, Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const COLORS = {
  fern:         '#1F4D3D',
  ember:        '#E85A34',
  sage:         '#F5F7F0',
  card:         '#FFFFFF',
  charcoal:     '#1C2620',
  charcoalSoft: '#5C6B62',
  wheat:        '#F0B429',
  line:         '#E1E7DC',
  surface:      '#243028',
  surfaceAlt:   '#2C3A31',
};

const FEATURES = [
  { emoji: '🥖', label: 'Fresh surplus food' },
  { emoji: '📍', label: 'Pick up nearby'     },
  { emoji: '💸', label: 'Up to 70% off'      },
];

function useStaggeredAnims(count) {
  const anims = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(
      90,
      anims.map((a) =>
        Animated.spring(a, {
          toValue: 1,
          damping: 22,
          stiffness: 160,
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);
  return anims;
}

function animStyle(anim, offset = 28) {
  return {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange:  [0, 1],
          outputRange: [offset, 0],
        }),
      },
    ],
  };
}

export default function OnboardingScreen({ navigation }) {
  // 7 elements to stagger: badge, headline, sub, 3 pills, cta block
  const [badge, headline, sub, pill1, pill2, pill3, cta] = useStaggeredAnims(7);
  const ctaScale = useRef(new Animated.Value(1)).current;

  function pressIn()  { Animated.spring(ctaScale, { toValue: 0.96, useNativeDriver: true }).start(); }
  function pressOut() { Animated.spring(ctaScale, { toValue: 1,    useNativeDriver: true }).start(); }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.charcoal} />

      {/* Decorative background circles */}
      <View style={styles.circleLarge} />
      <View style={styles.circleSmall} />

      <View style={styles.inner}>

        {/* Brand badge */}
        <Animated.View style={[styles.brandRow, animStyle(badge, 16)]}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>F</Text>
          </View>
          <Text style={styles.brandName}>FinalBatch</Text>
        </Animated.View>

        {/* Headline */}
        <Animated.Text style={[styles.headline, animStyle(headline, 32)]}>
          {'Good food.\nNear you.\nBefore it\u2019s gone.'}
        </Animated.Text>

        {/* Sub */}
        <Animated.Text style={[styles.sub, animStyle(sub, 24)]}>
          Vendors post their surplus. You pick it up
          fresh — at a fraction of the price.
        </Animated.Text>

        {/* Feature pills */}
        <View style={styles.pills}>
          {[pill1, pill2, pill3].map((anim, i) => (
            <Animated.View key={i} style={[styles.pill, animStyle(anim, 20)]}>
              <Text style={styles.pillEmoji}>{FEATURES[i].emoji}</Text>
              <Text style={styles.pillLabel}>{FEATURES[i].label}</Text>
            </Animated.View>
          ))}
        </View>

      </View>

      {/* CTA block pinned to bottom */}
      <Animated.View style={[styles.ctaBlock, animStyle(cta, 24)]}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={pressIn}
          onPressOut={pressOut}
          onPress={() => navigation.navigate('Auth', { initialMode: 'signup' })}
        >
          <Animated.View style={[styles.ctaBtn, { transform: [{ scale: ctaScale }] }]}>
            <Text style={styles.ctaBtnText}>Get started</Text>
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signInLink}
          onPress={() => navigation.navigate('Auth', { initialMode: 'login' })}
        >
          <Text style={styles.signInText}>I already have an account</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.charcoal,
    overflow: 'hidden',
  },

  // Background decoration
  circleLarge: {
    position: 'absolute',
    width: width * 1.1,
    height: width * 1.1,
    borderRadius: width * 0.55,
    backgroundColor: COLORS.surface,
    top: -width * 0.55,
    right: -width * 0.25,
  },
  circleSmall: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.surfaceAlt,
    bottom: 100,
    left: -60,
  },

  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
    justifyContent: 'center',
  },

  // Brand badge
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: COLORS.fern,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoMarkText: {
    color: COLORS.sage,
    fontWeight: '800',
    fontSize: 16,
  },
  brandName: {
    color: COLORS.sage,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
  },

  // Headline
  headline: {
    color: COLORS.sage,
    fontSize: 46,
    fontWeight: '800',
    lineHeight: 52,
    letterSpacing: -1.2,
    marginBottom: 20,
  },

  // Sub
  sub: {
    color: COLORS.charcoalSoft,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 36,
    maxWidth: 300,
  },

  // Feature pills
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceAlt,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  pillEmoji: {
    fontSize: 15,
    marginRight: 7,
  },
  pillLabel: {
    color: COLORS.sage,
    fontSize: 13,
    fontWeight: '600',
  },

  // CTA block
  ctaBlock: {
    paddingHorizontal: 28,
    paddingBottom: 36,
    gap: 14,
  },
  ctaBtn: {
    backgroundColor: COLORS.ember,
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  signInLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  signInText: {
    color: COLORS.charcoalSoft,
    fontSize: 14,
    fontWeight: '600',
  },
});
